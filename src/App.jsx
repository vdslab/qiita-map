import { useRef, useState, useEffect } from "react";
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
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${x},${y})scale(${k})`}>{children}</g>
    </svg>
  );
}

function Map({ startIndex, stopIndex }) {
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
  const aspectRatio = height / width;
  const contentWidth = 1000;
  const contentHeight = contentWidth * aspectRatio;
  const displayMargin = 20;
  const displayWidth = contentWidth + displayMargin * 2;
  const displayHeight = contentHeight + displayMargin * 2;
  const scaleX = d3
    .scaleLinear()
    .domain([left, right])
    .range([0, contentWidth]);
  const scaleY = d3
    .scaleLinear()
    .domain([bottom, top])
    .range([0, contentHeight]);
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
      d3.sum(d3.range(startIndex, stopIndex), (i) => region.count[i])
    )
    .size([contentWidth, contentHeight]);
  return (
    <ZoomableSVG width={displayWidth} height={displayHeight}>
      <g transform={`translate(${displayMargin},${displayMargin})`}>
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
                <path d={d3.geoPath()(polygon)} fill="white" opacity="0.1" />
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
    </ZoomableSVG>
  );
}

export default function App() {
  const [startIndex, setStartIndex] = useState(0);
  const [stopIndex, setStopIndex] = useState(data.months.length);
  return (
    <div>
      <div>
        <select
          value={startIndex}
          onChange={(event) => {
            setStartIndex(+event.target.value);
          }}
        >
          {data.months.map((month, i) => {
            return (
              <option key={month} value={i}>
                {month}
              </option>
            );
          })}
        </select>
        <select
          value={stopIndex}
          onChange={(event) => {
            setStopIndex(+event.target.value);
          }}
        >
          {data.months.map((month, i) => {
            return (
              <option key={month} value={i + 1}>
                {month}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <Map startIndex={startIndex} stopIndex={stopIndex} />
      </div>
    </div>
  );
}
