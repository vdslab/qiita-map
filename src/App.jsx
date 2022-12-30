import { useRef, useState, useEffect } from "react";
import ButtonGroup from "@mui/material/ButtonGroup";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import SettingsIcon from "@mui/icons-material/Settings";
import * as d3 from "d3";
import data from "./map.json";

function ZoomableSVG({ children, width, height }) {
  const svgRef = useRef();
  const [k, setK] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => {
    const zoom = d3
      .zoom()
      .scaleExtent([1, 5])
      .on("zoom", (event) => {
        const { x, y, k } = event.transform;
        setK(k);
        setX(x);
        setY(y);
      });
    d3.select(svgRef.current).call(zoom);
  }, []);
  return (
    <svg ref={svgRef} className="map" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${x},${y})scale(${k})`}>{children}</g>
    </svg>
  );
}

function Map({
  monthRange: [startIndex, stopIndex],
  displaySize: [displayWidth, displayHeight],
}) {
  const left = d3.min(data.regions, (region) =>
    d3.min(region.polygon, (p) => p[0])
  );
  const right = d3.max(data.regions, (region) =>
    d3.max(region.polygon, (p) => p[0])
  );
  const top = d3.min(data.regions, (region) =>
    d3.min(region.polygon, (p) => p[1])
  );
  const bottom = d3.max(data.regions, (region) =>
    d3.max(region.polygon, (p) => p[1])
  );
  const width = right - left;
  const height = bottom - top;
  const displayMargin = 5;
  const contentWidth = 1000;
  const contentHeight = 1000;
  const scale = width > height ? contentWidth / width : contentHeight / height;
  const scaleX = (x) => (x - (left + right) / 2) * scale + contentWidth / 2;
  const scaleY = (y) => (y - (top + bottom) / 2) * -scale + contentHeight / 2;
  const fontSizeScale = d3
    .scaleSqrt()
    .domain(d3.extent(data.regions, (region) => d3.sum(region.count)))
    .range([3, 14]);
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const kde = d3
    .contourDensity()
    .x((region) => scaleX(d3.polygonCentroid(region.polygon)[0]))
    .y((region) => scaleY(d3.polygonCentroid(region.polygon)[1]))
    .weight((region) =>
      d3.sum(d3.range(startIndex, stopIndex + 1), (i) => region.count[i])
    )
    .size([contentWidth, contentHeight]);
  return (
    <ZoomableSVG width={displayWidth} height={displayHeight}>
      <g transform={`translate(${displayWidth / 2},${displayHeight / 2})`}>
        <g
          transform={`scale(${
            displayWidth < displayHeight
              ? (displayWidth - 2 * displayMargin) / contentWidth
              : (displayHeight - 2 * displayMargin) / contentHeight
          })`}
        >
          <g
            transform={`translate(${-contentWidth / 2},${-contentHeight / 2})`}
          >
            <g>
              {data.regions.map((region) => {
                const path = d3.path();
                path.moveTo(
                  scaleX(region.polygon[0][0]),
                  scaleY(region.polygon[0][1])
                );
                for (let i = 1; i < region.polygon.length; ++i) {
                  path.lineTo(
                    scaleX(region.polygon[i][0]),
                    scaleY(region.polygon[i][1])
                  );
                }
                path.closePath();
                return (
                  <g key={region.tag}>
                    <path
                      d={path}
                      fill={color(region.community)}
                      stroke={color(region.community)}
                    />
                  </g>
                );
              })}
            </g>
            <g>
              {kde(data.regions).map((polygon, i) => {
                return (
                  <g key={i}>
                    <path
                      d={d3.geoPath()(polygon)}
                      fill="white"
                      opacity="0.1"
                    />
                  </g>
                );
              })}
            </g>
            <g>
              {data.regions.map((region) => {
                const [cx, cy] = d3.polygonCentroid(region.polygon);
                return (
                  <g key={region.tag}>
                    <text
                      x={scaleX(cx)}
                      y={scaleY(cy)}
                      fontSize={fontSizeScale(d3.sum(region.count))}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {region.tag}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </g>
      </g>
    </ZoomableSVG>
  );
}

export default function App() {
  const mapWrapperRef = useRef();
  const [displayMonthRange, setDisplayMonthRange] = useState([
    0,
    data.months.length - 1,
  ]);
  const [monthRange, setMonthRange] = useState(displayMonthRange);
  const [displaySize, setDisplaySize] = useState([
    window.innerWidth,
    window.innerHeight,
  ]);
  const [showDrawer, setShowDrawer] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setDisplaySize([
        mapWrapperRef.current.clientWidth,
        mapWrapperRef.current.clientHeight,
      ]);
    });
    observer.observe(mapWrapperRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <CssBaseline>
      <div
        ref={mapWrapperRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          overflow: "hidden",
        }}
      >
        <Map monthRange={monthRange} displaySize={displaySize} />
      </div>
      <Drawer
        anchor="bottom"
        open={showDrawer}
        onClose={() => {
          setShowDrawer(false);
        }}
      >
        <Container style={{ overflow: "hidden", padding: "2rem 2rem 0 2rem" }}>
          <Slider
            value={displayMonthRange}
            marks
            onChange={(_, newValue) => {
              setDisplayMonthRange(newValue);
            }}
            onChangeCommitted={(_, newValue) => {
              setMonthRange(newValue);
            }}
            disableSwap
            valueLabelDisplay="on"
            valueLabelFormat={(i) => data.months[i]}
            min={0}
            max={data.months.length - 1}
          />
        </Container>
      </Drawer>
      <div
        style={{ position: "absolute", bottom: 0, right: 0, padding: "1rem" }}
      >
        <ButtonGroup orientation="vertical" size="large">
          <IconButton
            size="large"
            onClick={() => {
              setShowDrawer(true);
            }}
          >
            <SettingsIcon />
          </IconButton>
        </ButtonGroup>
      </div>
    </CssBaseline>
  );
}
