import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Papa from 'papaparse';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';

// Add new interfaces
interface RawDataRow {
  [key: string]: string | number | null | undefined;
  'Text'?: string;
  'text'?: string;
  'Story of Self'?: string | number;
  'Story of Self (Origin)'?: string | number;
  'self'?: string | number;
  'Story of Us'?: string | number;
  'us'?: string | number;
  'Story of Now'?: string | number;
  'now'?: string | number;
  'Challenge'?: string | number;
  'challenge'?: string | number;
  'Choice'?: string | number;
  'choice'?: string | number;
  'Outcome'?: string | number;
  'outcome'?: string | number;
  'Specific/Vivid Details'?: string;
  'Sensory/Vivid Details'?: string;
  'Hope'?: string;
  'Values'?: string;
  'Vulnerability'?: string;
  'Third-Person Content'?: string;
  'Coding Notes'?: string;
}

interface TableBlockItem {
  startIndex: number;
  endIndex: number;
  self: boolean;
  us: boolean;
  now: boolean;
  challenge: boolean;
  choice: boolean;
  outcome: boolean;
}

interface ProcessedDataItem {
  sequenceNumber: number;
  self: boolean;
  us: boolean;
  now: boolean;
  challenge: boolean;
  choice: boolean;
  outcome: boolean;
  wordCount: number;
  originalRow: DataRow;
  startIndex: number;
  endIndex: number;
  position?: number;
}

interface GraphDataItem {
  id: number;
  top: number;
  height: number;
}

interface DataRow {
  lineNumber: string;
  text: string;
  storyOfSelf: string;
  storyOfUs: string;
  storyOfNow: string;
  challenge: string;
  choice: string;
  outcome: string;
  specificDetails: string;
  hope: string;
  values: string;
  vulnerability: string;
  thirdPersonContent: string;
  codingNotes: string;
  isHuman?: boolean;
}

interface ColumnWidth {
  [key: string]: number;
}

interface Filters {
  self: string;
  us: string;
  now: string;
  challenge: string;
  choice: string;
  outcome: string;
}

function Legend() {
  const colors = {
    self: '#8b00ff', // Purple
    us: '#0066cc',   // Blue
    now: '#ffd700'   // Yellow
  };

  return (
    <div className="legend-container">
      <div className="legend-section">
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Story Types</div>
          {[
            { label: 'Story of Self', color: colors.self },
            { label: 'Story of Us', color: colors.us },
            { label: 'Story of Now', color: colors.now }
          ].map((item) => (
            <div key={item.label} className="legend-item">
              <div className="legend-box" style={{ backgroundColor: item.color, opacity: 0.7 }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="legend-divider" />
      <div className="legend-section">
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Narrative Elements</div>
        <div className="legend-item">
          <div className="legend-box" style={{ backgroundColor: 'white', border: '2px solid #666' }} />
          <span>Challenge</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ backgroundColor: '#666666', opacity: 0.5 }} />
          <span>Choice</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ backgroundColor: '#666' }} />
          <span>Outcome</span>
        </div>
      </div>
    </div>
  );
}

function StoryDistributionGraph({ data, filters, hoveredLine, setHoveredLine, setHoverSource, isHuman }: { 
  data: DataRow[], 
  filters: Filters, 
  hoveredLine: string | null,
  setHoveredLine: (line: string | null) => void,
  setHoverSource: (source: 'graph' | 'table' | null) => void,
  isHuman: boolean
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    content: {
      self: boolean;
      us: boolean;
      now: boolean;
      challenge: boolean;
      choice: boolean;
      outcome: boolean;
      range: string;
    } | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: null
  });

  // Add tooltip container to DOM
  React.useEffect(() => {
    const tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'graph-tooltip';
    tooltipDiv.style.position = 'fixed';
    tooltipDiv.style.visibility = 'hidden';
    tooltipDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    tooltipDiv.style.padding = '8px';
    tooltipDiv.style.borderRadius = '4px';
    tooltipDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    tooltipDiv.style.fontSize = '12px';
    tooltipDiv.style.pointerEvents = 'none';
    tooltipDiv.style.zIndex = '1000';
    document.body.appendChild(tooltipDiv);

    return () => {
      document.body.removeChild(tooltipDiv);
    };
  }, []);

  // Update tooltip content and position
  React.useEffect(() => {
    const tooltipDiv = document.getElementById('graph-tooltip');
    if (!tooltipDiv) return;

    if (tooltip.visible && tooltip.content) {
      const content = tooltip.content;
      const hasStoryType = content.self || content.us || content.now;
      const hasNarrativeElement = content.challenge || content.choice || content.outcome;

      // Define neutral gray colors for narrative elements
      const grayColor = '#666666';

      // Create the diagonal stripes pattern for choice with gray
      const stripePattern = `
        background-image: linear-gradient(
          45deg,
          ${grayColor} 12.5%,
          transparent 12.5%,
          transparent 37.5%,
          ${grayColor} 37.5%,
          ${grayColor} 62.5%,
          transparent 62.5%,
          transparent 87.5%,
          ${grayColor} 87.5%
        );
        background-size: 8px 8px;
        background-color: transparent;
      `;

      tooltipDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">Lines ${content.range}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
          ${hasStoryType ? `
            ${content.self ? `
              <div style="background-color: #8b00ff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                Story of Self
              </div>` : ''}
            ${content.us ? `
              <div style="background-color: #0066cc; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                Story of Us
              </div>` : ''}
            ${content.now ? `
              <div style="background-color: #ffd700; color: black; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                Story of Now
              </div>` : ''}
          ` : `
            <div style="color: #666; font-style: italic; font-size: 11px;">No story type</div>
          `}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${hasNarrativeElement ? `
            ${content.challenge ? `
              <div style="
                background-color: white; 
                color: ${grayColor}; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 11px;
                border: 2px solid ${grayColor};
              ">
                Challenge
              </div>` : ''}
            ${content.choice ? `
              <div style="
                background-color: ${grayColor}; 
                opacity: 0.5;
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 11px;
                color: black;
              ">
                Choice
              </div>` : ''}
            ${content.outcome ? `
              <div style="
                background-color: ${grayColor}; 
                color: white; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 11px;
              ">
                Outcome
              </div>` : ''}
          ` : `
            <div style="color: #666; font-style: italic; font-size: 11px;">No challenge, choice, or outcome</div>
          `}
        </div>
      `;
      tooltipDiv.style.visibility = 'visible';
      
      // Position tooltip
      const tooltipRect = tooltipDiv.getBoundingClientRect();
      let x = tooltip.x;
      let y = tooltip.y;
      
      // Adjust position to keep tooltip in viewport
      if (x + tooltipRect.width > window.innerWidth) {
        x = window.innerWidth - tooltipRect.width - 10;
      }
      if (y + tooltipRect.height > window.innerHeight) {
        y = window.innerHeight - tooltipRect.height - 10;
      }
      
      tooltipDiv.style.left = `${x}px`;
      tooltipDiv.style.top = `${y}px`;
    } else {
      tooltipDiv.style.visibility = 'hidden';
    }
  }, [tooltip]);

  React.useEffect(() => {
    if (!data.length || !svgRef.current) return;

    console.log('Rendering graph:', {
      isHuman,
      dataLength: data.length,
      firstDataRow: data[0]
    });

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    // Get the container width and calculate 90%
    const containerWidth = (svgRef.current.parentElement?.clientWidth || 1200);
    
    // Setup dimensions with dynamic width
    const margin = { top: 15, right: 120, bottom: 25, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const height = 140 - margin.top - margin.bottom;
    const barHeight = 80;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Helper function to check for positive values
    const isPositive = (value: string | number | null | undefined): boolean => {
      if (typeof value === 'number') return value === 1;
      if (typeof value === 'string') return value === "1" || value === "2";
      return false;
    };

    // Process data for the graph
    const processedData = data
      .map((row, index) => ({
        sequenceNumber: index + 1,
        self: isPositive(row.storyOfSelf),
        us: isPositive(row.storyOfUs),
        now: isPositive(row.storyOfNow),
        challenge: isPositive(row.challenge),
        choice: isPositive(row.choice),
        outcome: isPositive(row.outcome),
        wordCount: row.text ? row.text.trim().split(/\s+/).length : 0,
        originalRow: row,
        startIndex: index + 1,
        endIndex: index + 1
      }))
      .filter(row => row.wordCount > 0);

    // Merge consecutive blocks with same ratings
    const mergedData = processedData.reduce((acc: ProcessedDataItem[], current, index) => {
      if (index === 0) {
        return [current];
      }

      const previous = acc[acc.length - 1];
      const hasSameRatings = 
        previous.self === current.self &&
        previous.us === current.us &&
        previous.now === current.now &&
        previous.challenge === current.challenge &&
        previous.choice === current.choice &&
        previous.outcome === current.outcome;

      if (hasSameRatings) {
        // Merge with previous block
        previous.wordCount += current.wordCount;
        previous.endIndex = current.endIndex;
        return acc;
      } else {
        // Start new block
        return [...acc, current];
      }
    }, []);

    // Calculate cumulative word counts for x-axis positioning
    let cumulativeWordCount = 0;
    const dataWithPosition = mergedData.map(d => {
      const position = cumulativeWordCount;
      cumulativeWordCount += d.wordCount;
      return { ...d, position };
    });

    // Function to check if a row matches the current filters
    const matchesFilters = (row: DataRow) => {
      if (filters.self !== 'all' && row.storyOfSelf !== filters.self) return false;
      if (filters.us !== 'all' && row.storyOfUs !== filters.us) return false;
      if (filters.now !== 'all' && row.storyOfNow !== filters.now) return false;
      if (filters.challenge !== 'all' && row.challenge !== filters.challenge) return false;
      if (filters.choice !== 'all' && row.choice !== filters.choice) return false;
      if (filters.outcome !== 'all' && row.outcome !== filters.outcome) return false;
      return true;
    };

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, cumulativeWordCount])
      .range([0, width]);

    // Add X axis with sequence numbers as ticks
    const xAxis = d3.axisBottom(xScale);
    const tickValues = dataWithPosition.map(d => d.position);
    xAxis.tickValues(tickValues)
        .tickFormat((d: d3.NumberValue) => '')  // Remove tick labels
        .tickSize(0);  // Remove tick lines

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call(g => g.select('.domain').remove());  // Remove axis line

    // Define colors for story types
    const colors = {
      self: '#8b00ff', // Purple
      us: '#0066cc',   // Blue
      now: '#ffd700'   // Yellow
    };

    const baseOpacity = 0.7;

    // Create patterns for narrative elements with dynamic colors
    const defs = svg.append('defs');

    // Create patterns for each story type
    Object.entries(colors).forEach(([storyType, color]) => {
      // Striped pattern for choice
      defs.append('pattern')
        .attr('id', `choice-pattern-${storyType}`)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 8)
        .attr('height', 8)
        .append('path')
        .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('opacity', baseOpacity);
    });

    // Create gray pattern for choice
    defs.append('pattern')
      .attr('id', 'choice-pattern-gray')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8)
      .append('path')
      .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
      .attr('stroke', '#666')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Create the bars group
    const bars = svg.append('g');

    // Add story type bars
    dataWithPosition.forEach((d, i) => {
      const barWidth = xScale(d.wordCount) - 1;
      const x = xScale(d.position) + 1;

      const getDominantStoryType = (data: ProcessedDataItem): 'self' | 'us' | 'now' | null => {
        // Check in order of priority: now > us > self
        if (data.now) return 'now';
        if (data.us) return 'us';
        if (data.self) return 'self';
        return null;
      };

      const dominantType = getDominantStoryType(d);
      const isFiltered = matchesFilters(d.originalRow);
      // Update hover detection to check if any line in the block is hovered
      const isHovered = hoveredLine ? (() => {
        const [start, end] = hoveredLine.split(',').map(Number);
        return d.startIndex <= end && d.endIndex >= start;
      })() : false;
      const currentOpacity = isHovered ? 1 : (isFiltered ? baseOpacity : 0.1);

      // Create a highlight effect for hovered bars
      if (isHovered) {
        bars.append('rect')
          .attr('class', 'highlight-bar')
          .attr('x', x - 1)
          .attr('y', 1)
          .attr('width', barWidth + 2)
          .attr('height', barHeight - 2)
          .attr('fill', 'none')
          .attr('stroke', '#ffd700')
          .attr('stroke-width', 2)
          .attr('rx', 3);
      }

      // Update hover area to include tooltip
      bars.append('rect')
        .attr('class', 'hover-area')
        .attr('x', x)
        .attr('y', 2)
        .attr('width', barWidth)
        .attr('height', barHeight - 4)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseenter', (event) => {
          setHoveredLine(`${d.startIndex},${d.endIndex}`);
          setHoverSource('graph');
          
          // Show tooltip
          const mouseEvent = event as MouseEvent;
          setTooltip({
            visible: true,
            x: mouseEvent.clientX + 10,
            y: mouseEvent.clientY + 10,
            content: {
              self: d.self,
              us: d.us,
              now: d.now,
              challenge: d.challenge,
              choice: d.choice,
              outcome: d.outcome,
              range: `${d.startIndex}-${d.endIndex}`
            }
          });
        })
        .on('mousemove', (event) => {
          const mouseEvent = event as MouseEvent;
          setTooltip(prev => ({
            ...prev,
            x: mouseEvent.clientX + 10,
            y: mouseEvent.clientY + 10
          }));
        })
        .on('mouseleave', () => {
          setHoveredLine(null);
          setHoverSource(null);
          setTooltip(prev => ({ ...prev, visible: false }));
        });

      if (dominantType) {
        const storyColor = colors[dominantType as keyof typeof colors];

        // Add narrative elements with story-specific styling
        if (d.challenge) {
          bars.append('rect')
            .attr('class', 'challenge-overlay')
            .attr('x', x)
            .attr('y', 2)
            .attr('width', barWidth)
            .attr('height', barHeight - 4)
            .attr('fill', storyColor)
            .attr('stroke', storyColor)
            .attr('stroke-width', 2)
            .attr('opacity', currentOpacity);
        }

        if (d.choice) {
          bars.append('rect')
            .attr('class', 'choice-overlay')
            .attr('x', x)
            .attr('y', 2)
            .attr('width', barWidth)
            .attr('height', barHeight - 4)
            .attr('fill', `url(#choice-pattern-${dominantType})`)
            .attr('opacity', currentOpacity);
        }

        if (d.outcome) {
          bars.append('rect')
            .attr('class', 'outcome-overlay')
            .attr('x', x)
            .attr('y', 2)
            .attr('width', barWidth)
            .attr('height', barHeight - 4)
            .attr('fill', storyColor)
            .attr('opacity', currentOpacity);
        }

        // Base story type bar (render after narrative elements)
        bars.append('rect')
          .attr('class', 'story-bar')
          .attr('x', x)
          .attr('y', 2)
          .attr('width', barWidth)
          .attr('height', barHeight - 4)
          .attr('fill', storyColor)
          .attr('opacity', 0.15)
          .attr('pointer-events', 'none')
          .style('transition', 'opacity 0.3s ease');
      }
    });

  }, [data, filters, hoveredLine, setHoveredLine, setHoverSource, isHuman]);

  return (
    <div className="graph-container">
      <div className="graph-svg-container">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}

function StoryStatistics({ data }: { data: DataRow[] }) {
  const StatBar = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <div className="stat-item">
      <div className="stat-label-group">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value.toFixed(1)}%</span>
      </div>
      <div className="stat-bar-container">
        <div 
          className="stat-bar" 
          style={{ 
            width: `${value}%`,
            backgroundColor: color || '#666'
          }}
        />
      </div>
    </div>
  );

  // If no data, return all zeros
  if (!data.length) {
    const emptyStats = {
      self: 0,
      us: 0,
      now: 0,
      challenge: 0,
      choice: 0,
      outcome: 0,
      noStoryType: 0,
      noNarrativeElement: 0
    };
    return (
      <div className="statistics-container">
        <div className="stats-section">
          <h3>Story Types</h3>
          <div className="stats-grid">
            <StatBar label="Story of Self" value={0} color="#8b00ff" />
            <StatBar label="Story of Us" value={0} color="#0066cc" />
            <StatBar label="Story of Now" value={0} color="#ffd700" />
            <StatBar label="No Story Type" value={0} />
          </div>
        </div>
        <div className="stats-section">
          <h3>Narrative Elements</h3>
          <div className="stats-grid">
            <StatBar label="Challenge" value={0} />
            <StatBar label="Choice" value={0} />
            <StatBar label="Outcome" value={0} />
            <StatBar label="No Elements" value={0} />
          </div>
        </div>
      </div>
    );
  }

  // Calculate total words
  const totalWords = data.reduce((sum, row) => sum + (row.text ? row.text.trim().split(/\s+/).length : 0), 0);

  // Calculate percentages based on word count
  const stats = {
    self: data.reduce((sum, row) => sum + (row.storyOfSelf ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    us: data.reduce((sum, row) => sum + (row.storyOfUs ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    now: data.reduce((sum, row) => sum + (row.storyOfNow ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    challenge: data.reduce((sum, row) => sum + (row.challenge ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    choice: data.reduce((sum, row) => sum + (row.choice ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    outcome: data.reduce((sum, row) => sum + (row.outcome ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    noStoryType: data.reduce((sum, row) => sum + (!row.storyOfSelf && !row.storyOfUs && !row.storyOfNow ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100,
    noNarrativeElement: data.reduce((sum, row) => sum + (!row.challenge && !row.choice && !row.outcome ? (row.text ? row.text.trim().split(/\s+/).length : 0) : 0), 0) / totalWords * 100
  };

  return (
    <div className="statistics-container">
      <div className="stats-section">
        <h3>Story Types</h3>
        <div className="stats-grid">
          <StatBar label="Story of Self" value={stats.self} color="#8b00ff" />
          <StatBar label="Story of Us" value={stats.us} color="#0066cc" />
          <StatBar label="Story of Now" value={stats.now} color="#ffd700" />
          <StatBar label="No Story Type" value={stats.noStoryType} />
        </div>
      </div>
      <div className="stats-section">
        <h3>Narrative Elements</h3>
        <div className="stats-grid">
          <StatBar label="Challenge" value={stats.challenge} />
          <StatBar label="Choice" value={stats.choice} />
          <StatBar label="Outcome" value={stats.outcome} />
          <StatBar label="No Elements" value={stats.noNarrativeElement} />
        </div>
      </div>
    </div>
  );
}

function App(): React.ReactElement {
  const [data, setData] = React.useState<DataRow[]>([]);
  const [humanData, setHumanData] = React.useState<DataRow[]>([]);
  const [filteredData, setFilteredData] = React.useState<DataRow[]>([]);
  const [selectedStory, setSelectedStory] = React.useState<string>('');
  const [allStories, setAllStories] = React.useState<{[key: string]: { model: DataRow[]; human: DataRow[] }}>({});
  const [columnWidths, setColumnWidths] = React.useState<ColumnWidth>({});
  const [resizing, setResizing] = React.useState<string | null>(null);
  const [startX, setStartX] = React.useState<number>(0);
  const [startWidth, setStartWidth] = React.useState<number>(0);
  const [filters, setFilters] = React.useState<Filters>({
    self: 'all',
    us: 'all',
    now: 'all',
    challenge: 'all',
    choice: 'all',
    outcome: 'all'
  });
  const [hoveredLine, setHoveredLine] = React.useState<string | null>(null);
  const [hoverSource, setHoverSource] = React.useState<'graph' | 'table' | null>(null);

  const handleMouseDown = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const th = e.currentTarget.parentElement as HTMLElement;
    setResizing(columnId);
    setStartX(e.pageX);
    setStartWidth(th.offsetWidth);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (resizing) {
      const diff = e.pageX - startX;
      const newWidth = Math.max(60, startWidth + diff); // Minimum width based on column
      setColumnWidths(prev => ({
        ...prev,
        [resizing]: newWidth
      }));
    }
  }, [resizing, startX, startWidth]);

  const handleMouseUp = React.useCallback(() => {
    setResizing(null);
  }, []);

  React.useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [resizing, handleMouseMove, handleMouseUp]);

  // Load all story files
  React.useEffect(() => {
    const storyFiles = [
      { name: 'Kamala', file: `${process.env.PUBLIC_URL}/Kamala_LLM.csv`, humanFile: `${process.env.PUBLIC_URL}/KamalaHuman.csv` },
      { name: 'James', file: `${process.env.PUBLIC_URL}/James_LLM.csv`, humanFile: `${process.env.PUBLIC_URL}/JamesHuman.csv` },
      { name: 'Tim', file: `${process.env.PUBLIC_URL}/Tim_LLM.csv`, humanFile: `${process.env.PUBLIC_URL}/TimHuman.csv` }
    ];

    Promise.all(storyFiles.map(story => 
      Promise.all([
        // Load model annotations
        fetch(story.file)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load ${story.file}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(csvText => {
            const results = Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true
            });
            
            return processData(results.data as any[], false);
          }),
        // Load human annotations
        fetch(story.humanFile)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load ${story.file}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(csvText => {
            const results = Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true
            });
            
            return processData(results.data as any[], false);
          }),
        // Load human annotations
        fetch(story.humanFile)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load ${story.humanFile}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(csvText => {
            const results = Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true
            });
            
            return processData(results.data as any[], true);
          })
      ]).then(([modelData, humanData]) => ({
        name: story.name,
        modelData,
        humanData
      }))
    ))
    .then(results => {
      const storiesData = results.reduce((acc, { name, modelData, humanData }) => {
        acc[name] = {
          model: modelData,
          human: humanData
        };
        return acc;
      }, {} as {[key: string]: { model: DataRow[]; human: DataRow[] }});
      
      setAllStories(storiesData);
      setData([]);
      setHumanData([]);
    })
    .catch(error => {
      console.error('Error loading CSV files:', error);
    });
  }, []);

  // Process data function
  const processData = (rawData: RawDataRow[], isHuman: boolean): DataRow[] => {
    console.log('Processing data:', {
      isHuman,
      rawDataLength: rawData.length,
      firstRow: rawData[0]
    });
    
    const processedData = rawData
      .map((row, index) => {
        // Helper function to convert annotation values
        const convertAnnotation = (value: string | number | undefined | null): string => {
          if (value === undefined || value === null || value === '') return '';
          // Convert numeric 1 to string "1" and numeric 0 to empty string
          if (typeof value === 'number') return value === 1 ? "1" : "";
          return value;
        };

        return {
          lineNumber: (index + 1).toString(),
          text: row['Text'] || row['text'] || '',
          storyOfSelf: convertAnnotation(row['Story of Self'] || row['Story of Self (Origin)'] || row['self']),
          storyOfUs: convertAnnotation(row['Story of Us'] || row['us']),
          storyOfNow: convertAnnotation(row['Story of Now'] || row['now']),
          challenge: convertAnnotation(row['Challenge'] || row['challenge']),
          choice: convertAnnotation(row['Choice'] || row['choice']),
          outcome: convertAnnotation(row['Outcome'] || row['outcome']),
          specificDetails: row['Specific/Vivid Details'] || row['Sensory/Vivid Details'] || '',
          hope: row['Hope'] || '',
          values: row['Values'] || '',
          vulnerability: row['Vulnerability'] || '',
          thirdPersonContent: row['Third-Person Content'] || '',
          codingNotes: row['Coding Notes'] || '',
          isHuman
        };
      })
      .filter(row => {
        const hasText = row.text.length > 0 && row.text !== 'Wow.' && row.text !== 'Thank you.' && row.text !== 'Absolutely.';
        return hasText;
      });

    console.log('Processed data:', {
      isHuman,
      processedDataLength: processedData.length,
      firstProcessedRow: processedData[0]
    });

    return processedData;
  };

  // Handle story selection
  const handleStoryChange = (storyName: string) => {
    setSelectedStory(storyName);
    const storyData = allStories[storyName];
    if (storyData) {
      console.log('Loading story data:', {
        modelDataLength: storyData.model.length,
        humanDataLength: storyData.human.length,
        storyName
      });
      setData(storyData.model || []);
      setHumanData(storyData.human || []);
    } else {
      setData([]);
      setHumanData([]);
    }
  };

  // Update filtered data when data or filters change
  React.useEffect(() => {
    let filtered = [...data];

    // Apply filters
    if (filters.self !== 'all') {
      filtered = filtered.filter(row => row.storyOfSelf === filters.self);
    }
    if (filters.us !== 'all') {
      filtered = filtered.filter(row => row.storyOfUs === filters.us);
    }
    if (filters.now !== 'all') {
      filtered = filtered.filter(row => row.storyOfNow === filters.now);
    }
    if (filters.challenge !== 'all') {
      filtered = filtered.filter(row => row.challenge === filters.challenge);
    }
    if (filters.choice !== 'all') {
      filtered = filtered.filter(row => row.choice === filters.choice);
    }
    if (filters.outcome !== 'all') {
      filtered = filtered.filter(row => row.outcome === filters.outcome);
    }

    setFilteredData(filtered);
  }, [data, filters]);

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const columns = [
    { id: 'sequenceNumber', label: '#' },
    { id: 'text', label: 'Text' },
    { id: 'storyOfSelf', label: 'Self' },
    { id: 'storyOfUs', label: 'Us' },
    { id: 'storyOfNow', label: 'Now' },
    { id: 'challenge', label: 'Challenge' },
    { id: 'choice', label: 'Choice' },
    { id: 'outcome', label: 'Outcome' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: '2', label: 'Very Much (2)' },
    { value: '1', label: 'Somewhat (1)' },
    { value: '', label: 'Not Present (0)' }
  ];

  // Add ref for table container
  const tableRef = React.useRef<HTMLDivElement>(null);

  // Helper function to find block for a line number
  const findBlockForLine = (lineNumber: number, processedData: TableBlockItem[]): [number, number] | null => {
    for (const block of processedData) {
      if (lineNumber >= block.startIndex && lineNumber <= block.endIndex) {
        return [block.startIndex, block.endIndex];
      }
    }
    return null;
  };

  // Update the table row hover handlers
  const handleTableHover = (lineNumber: string | null) => {
    if (!lineNumber) {
      setHoveredLine(null);
      setHoverSource('table');
      return;
    }

    // Process the data to find blocks
    const processedData = data
      .map((row, index) => ({
        startIndex: index + 1,
        endIndex: index + 1,
        self: Boolean(row.storyOfSelf === "1" || row.storyOfSelf === "2" || String(row.storyOfSelf) === "1"),
        us: Boolean(row.storyOfUs === "1" || row.storyOfUs === "2" || String(row.storyOfUs) === "1"),
        now: Boolean(row.storyOfNow === "1" || row.storyOfNow === "2" || String(row.storyOfNow) === "1"),
        challenge: Boolean(row.challenge === "1" || row.challenge === "2" || String(row.challenge) === "1"),
        choice: Boolean(row.choice === "1" || row.choice === "2" || String(row.choice) === "1"),
        outcome: Boolean(row.outcome === "1" || row.outcome === "2" || String(row.outcome) === "1"),
      }))
      .reduce((acc: TableBlockItem[], current) => {
        if (acc.length === 0) return [current];
        
        const previous = acc[acc.length - 1];
        const hasSameRatings = 
          previous.self === current.self &&
          previous.us === current.us &&
          previous.now === current.now &&
          previous.challenge === current.challenge &&
          previous.choice === current.choice &&
          previous.outcome === current.outcome;

        if (hasSameRatings) {
          previous.endIndex = current.endIndex;
          return acc;
        } else {
          return [...acc, current];
        }
      }, []);

    const block = findBlockForLine(parseInt(lineNumber), processedData);
    if (block) {
      setHoveredLine(`${block[0]},${block[1]}`);
      setHoverSource('table');
    }
  };

  // Update table row highlighting
  const isLineHighlighted = (lineNumber: number) => {
    if (!hoveredLine) return false;
    const [start, end] = hoveredLine.split(',').map(Number);
    return lineNumber >= start && lineNumber <= end;
  };

  // Update auto-scrolling effect to handle ranges
  React.useEffect(() => {
    if (hoveredLine && hoverSource === 'graph' && tableRef.current) {
      const [start] = hoveredLine.split(',').map(Number);
      const row = tableRef.current.querySelector(`tr[data-line="${start}"]`);
      if (row) {
        const tableRect = tableRef.current.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const targetPosition = tableRect.height * 0.25; // Scroll to show block near the top
        const scrollTop = rowRect.top - tableRect.top - targetPosition + tableRef.current.scrollTop;
        
        tableRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [hoveredLine, hoverSource]);

  return (
    <div className="App">
      <h1>PN Codebook Data Visualization</h1>
      
      <div className="story-selector">
        <label>Select Story:</label>
        <select
          value={selectedStory}
          onChange={(e) => handleStoryChange(e.target.value)}
          className={!selectedStory ? 'empty-selection' : ''}
        >
          <option value="">Select a story</option>
          {Object.keys(allStories).map(storyName => (
            <option key={storyName} value={storyName}>
              {storyName}'s Story
            </option>
          ))}
        </select>
      </div>

      <StoryStatistics data={data} />

      <div className="filters-container">
        <h2>Filters</h2>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Story of Self</label>
            <select
              value={filters.self}
              onChange={(e) => handleFilterChange('self', e.target.value)}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Story of Us</label>
            <select
              value={filters.us}
              onChange={(e) => handleFilterChange('us', e.target.value)}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Story of Now</label>
            <select
              value={filters.now}
              onChange={(e) => handleFilterChange('now', e.target.value)}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Challenge</label>
            <select
              value={filters.challenge}
              onChange={(e) => handleFilterChange('challenge', e.target.value)}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Choice</label>
            <select
              value={filters.choice}
              onChange={(e) => handleFilterChange('choice', e.target.value)}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Outcome</label>
            <select
              value={filters.outcome}
              onChange={(e) => handleFilterChange('outcome', e.target.value)}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="visualizations-container">
        <Legend />
        <div className="visualization-section">
          <h3>Human Annotations</h3>
          <StoryDistributionGraph 
            data={humanData} 
            filters={filters} 
            hoveredLine={hoveredLine}
            setHoveredLine={setHoveredLine}
            setHoverSource={setHoverSource}
            isHuman={true}
          />
        </div>
        
        <div className="visualization-section">
          <h3>Model Annotations</h3>
          <StoryDistributionGraph 
            data={data} 
            filters={filters} 
            hoveredLine={hoveredLine}
            setHoveredLine={setHoveredLine}
            setHoverSource={setHoverSource}
            isHuman={false}
          />
        </div>
        
        <div className="export-graph-button-container" style={{ textAlign: 'center', margin: '20px 0' }}>
          <button 
            className="export-button"
            onClick={() => {
              // Get the visualization container
              const visualizationContainer = document.querySelector('.visualizations-container');
              if (!visualizationContainer) return;

              // Use html2canvas to capture the visualization
              html2canvas(visualizationContainer as HTMLElement, {
                backgroundColor: 'white',
                scale: 2, // Higher scale for better quality
                logging: false,
                onclone: (documentClone) => {
                  // Prepare cloned element for optimal capture
                  const clonedViz = documentClone.querySelector('.visualizations-container') as HTMLElement;
                  if (clonedViz) {
                    // Clear existing content but keep the Legend
                    const legend = clonedViz.querySelector('.legend-container');
                    const graphContainers = clonedViz.querySelectorAll('.visualization-section');
                    
                    if (legend && graphContainers.length >= 2) {
                      // Create a new container to hold our custom layout
                      const newContainer = document.createElement('div');
                      newContainer.style.backgroundColor = 'white';
                      newContainer.style.padding = '20px';
                      newContainer.style.display = 'flex';
                      newContainer.style.flexDirection = 'column';
                      newContainer.style.alignItems = 'center';
                      newContainer.style.width = '100%';
                      newContainer.style.maxWidth = '3600px'; // 3x wider than 1200px
                      
                      // Add title
                      const title = document.createElement('h2');
                      title.textContent = `${selectedStory || 'Transcript'} - Annotation Patterns`;
                      title.style.textAlign = 'center';
                      title.style.margin = '0 0 20px 0';
                      title.style.fontSize = '24px';
                      
                      // Create centered legend container with horizontal layout
                      const legendContainer = document.createElement('div');
                      legendContainer.style.display = 'flex';
                      legendContainer.style.justifyContent = 'center';
                      legendContainer.style.marginBottom = '30px';
                      legendContainer.style.width = '100%';
                      
                      // Clone and add the legend
                      const legendClone = legend.cloneNode(true) as HTMLElement;
                      
                      // Modify the legend to make all items horizontal
                      const legendSections = legendClone.querySelectorAll('.legend-section');
                      legendSections.forEach(section => {
                        const sectionEl = section as HTMLElement;
                        sectionEl.style.display = 'flex';
                        sectionEl.style.flexDirection = 'row';
                        sectionEl.style.alignItems = 'center';
                        
                        // Find the title and make it inline
                        const titleDiv = sectionEl.querySelector('div > div:first-child');
                        if (titleDiv) {
                          const titleEl = titleDiv as HTMLElement;
                          titleEl.style.marginRight = '15px';
                          titleEl.style.marginBottom = '0';
                          titleEl.style.fontSize = '14px';
                          titleEl.style.fontWeight = 'bold';
                          titleEl.style.whiteSpace = 'nowrap';
                        }
                        
                        // Make all legend items horizontal
                        const legendItems = sectionEl.querySelectorAll('.legend-item');
                        legendItems.forEach(item => {
                          const itemEl = item as HTMLElement;
                          itemEl.style.marginLeft = '10px';
                          itemEl.style.marginRight = '10px';
                          itemEl.style.display = 'inline-flex';
                        });
                      });
                      
                      // Remove the divider and make the whole legend horizontal
                      const divider = legendClone.querySelector('.legend-divider');
                      if (divider) {
                        divider.remove();
                      }
                      
                      legendClone.style.display = 'flex';
                      legendClone.style.flexDirection = 'row';
                      legendClone.style.justifyContent = 'center';
                      legendClone.style.alignItems = 'center';
                      legendClone.style.flexWrap = 'wrap';
                      
                      legendContainer.appendChild(legendClone);
                      
                      // Get the graph SVGs
                      const humanGraph = graphContainers[0].querySelector('.graph-svg-container svg');
                      const modelGraph = graphContainers[1].querySelector('.graph-svg-container svg');
                      
                      if (humanGraph && modelGraph) {
                        // Create container for human annotations
                        const humanContainer = document.createElement('div');
                        humanContainer.style.marginBottom = '40px';
                        humanContainer.style.width = '100%';
                        humanContainer.style.maxWidth = '3300px'; // 3x wider than 1100px
                        humanContainer.style.position = 'relative';
                        humanContainer.style.margin = '0 auto 40px auto'; // Center horizontally
                        
                        // Add label above the human graph
                        const humanLabel = document.createElement('div');
                        humanLabel.textContent = 'Human Annotations';
                        humanLabel.style.fontWeight = 'bold';
                        humanLabel.style.marginBottom = '5px';
                        humanLabel.style.fontSize = '18px';
                        humanLabel.style.position = 'absolute';
                        humanLabel.style.top = '-30px';
                        humanLabel.style.left = '0';
                        humanLabel.style.width = '100%';
                        humanLabel.style.textAlign = 'center';
                        
                        // Clone and add the human graph
                        humanContainer.appendChild(humanLabel);
                        const clonedHumanGraph = humanGraph.cloneNode(true) as HTMLElement;
                        clonedHumanGraph.style.width = '100%'; // Ensure graph takes full width of container
                        clonedHumanGraph.style.margin = '0 auto'; // Center the graph
                        
                        // Ensure SVG viewBox is set correctly to show full width and increase height
                        if (clonedHumanGraph instanceof SVGElement) {
                          const width = parseInt(clonedHumanGraph.getAttribute('width') || '0', 10);
                          const height = parseInt(clonedHumanGraph.getAttribute('height') || '0', 10);
                          if (width && height) {
                            // Make 3x wider and 5x taller
                            const newWidth = width * 3;
                            const newHeight = height * 5;
                            clonedHumanGraph.setAttribute('viewBox', `0 0 ${width} ${height}`);
                            clonedHumanGraph.setAttribute('width', newWidth.toString());
                            clonedHumanGraph.setAttribute('height', newHeight.toString());
                            clonedHumanGraph.style.width = '100%';
                            clonedHumanGraph.style.height = `${newHeight}px`;
                          }
                        }
                        
                        humanContainer.appendChild(clonedHumanGraph);
                        
                        // Create container for model annotations
                        const modelContainer = document.createElement('div');
                        modelContainer.style.width = '100%';
                        modelContainer.style.maxWidth = '3300px'; // 3x wider than 1100px
                        modelContainer.style.position = 'relative';
                        modelContainer.style.margin = '0 auto'; // Center horizontally
                        
                        // Add label above the model graph
                        const modelLabel = document.createElement('div');
                        modelLabel.textContent = 'Model Annotations';
                        modelLabel.style.fontWeight = 'bold';
                        modelLabel.style.marginBottom = '5px';
                        modelLabel.style.fontSize = '18px';
                        modelLabel.style.position = 'absolute';
                        modelLabel.style.top = '-30px';
                        modelLabel.style.left = '0';
                        modelLabel.style.width = '100%';
                        modelLabel.style.textAlign = 'center';

                        // Clone and add the model graph
                        modelContainer.appendChild(modelLabel);
                        const clonedModelGraph = modelGraph.cloneNode(true) as HTMLElement;
                        clonedModelGraph.style.width = '100%'; // Ensure graph takes full width of container
                        clonedModelGraph.style.margin = '0 auto'; // Center the graph
                        
                        // Ensure SVG viewBox is set correctly to show full width and increase height
                        if (clonedModelGraph instanceof SVGElement) {
                          const width = parseInt(clonedModelGraph.getAttribute('width') || '0', 10);
                          const height = parseInt(clonedModelGraph.getAttribute('height') || '0', 10);
                          if (width && height) {
                            // Make 3x wider and 5x taller
                            const newWidth = width * 3;
                            const newHeight = height * 5;
                            clonedModelGraph.setAttribute('viewBox', `0 0 ${width} ${height}`);
                            clonedModelGraph.setAttribute('width', newWidth.toString());
                            clonedModelGraph.setAttribute('height', newHeight.toString());
                            clonedModelGraph.style.width = '100%';
                            clonedModelGraph.style.height = `${newHeight}px`;
                          }
                        }
                        
                        modelContainer.appendChild(clonedModelGraph);
                        
                        // Add all elements to the new container
                        newContainer.appendChild(title);
                        newContainer.appendChild(legendContainer);
                        newContainer.appendChild(humanContainer);
                        newContainer.appendChild(modelContainer);
                        
                        // Replace the original content with our custom layout
                        clonedViz.innerHTML = '';
                        clonedViz.appendChild(newContainer);
                      }
                    } else {
                      // Fallback if we can't find the elements we need
                      clonedViz.style.padding = '20px';
                      clonedViz.style.backgroundColor = 'white';
                      
                      // Add a title
                      const titleEl = document.createElement('h2');
                      titleEl.textContent = `${selectedStory || 'Transcript'} - Annotation Patterns`;
                      titleEl.style.textAlign = 'center';
                      titleEl.style.margin = '0 0 20px 0';
                      clonedViz.insertBefore(titleEl, clonedViz.firstChild);
                    }
                  }
                  return documentClone;
                }
              }).then(canvas => {
                // Convert canvas to PNG and download
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${selectedStory || 'transcript'}_graph.png`;
                link.href = imgData;
                link.click();
              }).catch(err => {
                console.error('Error exporting graph visualization:', err);
                alert('There was an error exporting the graph visualization. Please try again.');
              });
            }}
          >
            Export Graphs as PNG
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-scroll" ref={tableRef}>
          <table>
            <thead>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.id}
                    style={{ width: columnWidths[column.id] || 'auto' }}
                  >
                    {column.label}
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleMouseDown(e, column.id)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr 
                  key={index}
                  data-line={index + 1}
                  onMouseEnter={() => {
                    handleTableHover((index + 1).toString());
                    setHoverSource('table');
                  }}
                  onMouseLeave={() => {
                    handleTableHover(null);
                    setHoverSource(null);
                  }}
                  className={isLineHighlighted(index + 1) ? 'highlighted' : ''}
                >
                  <td className={columnWidths['sequenceNumber'] ? '' : 'has-value'} style={{ width: columnWidths['sequenceNumber'] || 'auto' }}>
                    {index + 1}
                  </td>
                  {columns.slice(1).map(column => (
                    <td
                      key={column.id}
                      className={row[column.id as keyof DataRow] ? 'has-value' : ''}
                      style={{ width: columnWidths[column.id] || 'auto' }}
                    >
                      {row[column.id as keyof DataRow]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Highlighted Transcript Component */}
      <div className="highlighted-transcript-container">
        <div className="transcript-header">
          <h2>Transcript Comparison</h2>
          <button 
            className="export-button"
            onClick={() => {
              // Get the transcript container for export
              const transcriptContainer = document.querySelector('.transcript-with-minimap');
              if (!transcriptContainer) return;

              // Create a clone of the container for customization
              const clone = transcriptContainer.cloneNode(true) as HTMLElement;
              
              // Create a wrapper to hold everything
              const wrapper = document.createElement('div');
              wrapper.style.backgroundColor = 'white';
              wrapper.style.padding = '40px';
              wrapper.style.width = '90%'; // Set to 90% of previous width
              wrapper.style.maxWidth = '1080px'; // Reduced from 1200px (if that was the implicit width)
              wrapper.style.margin = '0 auto';
              wrapper.style.position = 'absolute';
              wrapper.style.left = '-9999px';
              
              // Add title
              const title = document.createElement('h2');
              title.textContent = `${selectedStory || 'Transcript'} - Annotation Comparison`;
              title.style.textAlign = 'center';
              title.style.margin = '0 0 30px 0';
              title.style.fontSize = '28px';
              wrapper.appendChild(title);
              
              // Add column headers
              const headerContainer = document.createElement('div');
              headerContainer.style.display = 'flex';
              headerContainer.style.justifyContent = 'space-between';
              headerContainer.style.margin = '0 0 20px 40px';
              headerContainer.style.width = 'calc(100% - 80px)';
              
              const modelHeader = document.createElement('h3');
              modelHeader.textContent = 'Model Annotations';
              modelHeader.style.flex = '1';
              modelHeader.style.textAlign = 'center';
              modelHeader.style.margin = '0';
              modelHeader.style.fontSize = '24px';
              modelHeader.style.fontWeight = 'bold';
              
              const humanHeader = document.createElement('h3');
              humanHeader.textContent = 'Human Annotations';
              humanHeader.style.flex = '1';
              humanHeader.style.textAlign = 'center';
              humanHeader.style.margin = '0';
              humanHeader.style.fontSize = '24px';
              humanHeader.style.fontWeight = 'bold';
              
              headerContainer.appendChild(modelHeader);
              headerContainer.appendChild(humanHeader);
              wrapper.appendChild(headerContainer);
              
              // Process all text blocks to limit to 2 lines with ellipses and increase font size
              const textBlocks = clone.querySelectorAll('.text-block');
              
              // Modify the transcript container to be narrower
              clone.style.width = '90%';
              clone.style.margin = '0 auto';
              
              // Process the first 40 lines
              textBlocks.forEach((block, index) => {
                // Remove blocks beyond line 40
                if (index >= 40) {
                  block.remove();
                  return;
                }
                
                const blockEl = block as HTMLElement;
                
                // Set fixed dimensions to ensure exactly 2 lines are shown
                blockEl.style.maxHeight = '3.5em';
                blockEl.style.height = '3.5em';
                blockEl.style.overflow = 'hidden';
                blockEl.style.fontSize = '18px';
                blockEl.style.lineHeight = '1.4'; 
                blockEl.style.padding = '8px 12px';
                blockEl.style.boxSizing = 'border-box';
                blockEl.style.width = '90%'; // Reduce width to 90%
                blockEl.style.margin = '0 auto'; // Center the block
                
                // Special handling for line 39 - combine with lines 40-41
                if (index === 38) {
                  const line39 = blockEl.textContent || '';
                  const line40 = (textBlocks[39] as HTMLElement)?.textContent || '';
                  const line41 = (textBlocks[40] as HTMLElement)?.textContent || '';
                  
                  // Combine the text and truncate if over 87 characters
                  const combinedText = line39 + ' ' + line40 + ' ' + line41;
                  if (combinedText.length > 87) {
                    blockEl.textContent = combinedText.substring(0, 87) + '...';
                  } else {
                    blockEl.textContent = combinedText;
                  }
                } else if (index === 39 || index === 40) {
                  // Remove lines 40-41 as they are included in line 39
                  blockEl.remove();
                } else {
                  // For all other lines, add ellipses only if text is over 87 characters
                  const text = blockEl.textContent || '';
                  if (text.length > 87) {
                    blockEl.textContent = text.substring(0, 87) + '...';
                  }
                }
              });
              
              // Add the modified transcript container
              wrapper.appendChild(clone);
              
              // Add legend/key with horizontal layout at the bottom
              const legend = document.querySelector('.legend-container');
              if (legend) {
                const legendClone = legend.cloneNode(true) as HTMLElement;
                legendClone.style.margin = '40px auto 0 auto';
                legendClone.style.maxWidth = '90%';
                
                // Modify the legend to make all items horizontal
                const legendSections = legendClone.querySelectorAll('.legend-section');
                legendSections.forEach(section => {
                  const sectionEl = section as HTMLElement;
                  sectionEl.style.display = 'flex';
                  sectionEl.style.flexDirection = 'row';
                  sectionEl.style.alignItems = 'center';
                  
                  // Find the title and make it inline
                  const titleDiv = sectionEl.querySelector('div > div:first-child');
                  if (titleDiv) {
                    const titleEl = titleDiv as HTMLElement;
                    titleEl.style.marginRight = '15px';
                    titleEl.style.marginBottom = '0';
                    titleEl.style.fontSize = '16px';
                    titleEl.style.fontWeight = 'bold';
                    titleEl.style.whiteSpace = 'nowrap';
                  }
                  
                  // Make all legend items horizontal
                  const legendItems = sectionEl.querySelectorAll('.legend-item');
                  legendItems.forEach(item => {
                    const itemEl = item as HTMLElement;
                    itemEl.style.marginLeft = '10px';
                    itemEl.style.marginRight = '10px';
                    itemEl.style.display = 'inline-flex';
                    itemEl.style.fontSize = '16px';
                  });
                });
                
                // Remove the divider and make the whole legend horizontal
                const divider = legendClone.querySelector('.legend-divider');
                if (divider) {
                  divider.remove();
                }
                
                legendClone.style.display = 'flex';
                legendClone.style.flexDirection = 'row';
                legendClone.style.justifyContent = 'center';
                legendClone.style.alignItems = 'center';
                legendClone.style.flexWrap = 'wrap';
                
                wrapper.appendChild(legendClone);
              }
              
              // Add to document temporarily
              document.body.appendChild(wrapper);
              
              // Use html2canvas on our prepared wrapper
              html2canvas(wrapper, {
                backgroundColor: 'white',
                scale: 2, // Higher scale for better quality
                logging: false,
                width: wrapper.offsetWidth,
                height: wrapper.offsetHeight
              }).then(canvas => {
                // Convert canvas to PNG and download
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${selectedStory || 'transcript'}_visualization.png`;
                link.href = imgData;
                link.click();
                
                // Clean up
                document.body.removeChild(wrapper);
              }).catch(err => {
                console.error('Error exporting visualization:', err);
                alert('There was an error exporting the visualization. Please try again.');
                document.body.removeChild(wrapper);
              });
            }}
          >
            Export Visualization as PNG
          </button>
        </div>
        <div className="transcript-comparison-header">
          <div className="transcript-column">
            <h3>Model Annotations</h3>
          </div>
          <div className="transcript-column">
            <h3>Human Annotations</h3>
          </div>
        </div>
        <SideBySideTranscript modelData={data} humanData={humanData} />
      </div>
    </div>
  );
}

interface SideBySideTranscriptProps {
  modelData: DataRow[];
  humanData: DataRow[];
}

// Interface for annotations extracted from DataRow
interface Annotation {
  self: string;
  us: string;
  now: string;
  challenge: string;
  choice: string;
  outcome: string;
}

// Interface for transcript blocks
interface TranscriptBlock {
  lineStart: number;
  lineEnd: number;
  text: string[];
  modelTags: string[];
  humanTags: string[];
}

// Interface for block position measurement
interface BlockRect {
  id: number;
  top: number;
  height: number;
}

const SideBySideTranscript = ({ modelData, humanData }: SideBySideTranscriptProps) => {
  // Add a ref for the transcript container to handle scrolling
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [blockRects, setBlockRects] = useState<BlockRect[]>([]);
  
  // Extract transcript lines from model data
  const transcript = modelData.map(row => row.text);
  
  // Transform model and human data into annotation objects
  const modelAnnotations = modelData.map(row => ({
    self: row.storyOfSelf,
    us: row.storyOfUs,
    now: row.storyOfNow,
    challenge: row.challenge,
    choice: row.choice,
    outcome: row.outcome
  }));
  
  const humanAnnotations = humanData.map(row => ({
    self: row.storyOfSelf,
    us: row.storyOfUs,
    now: row.storyOfNow,
    challenge: row.challenge,
    choice: row.choice,
    outcome: row.outcome
  }));
  
  // Helper function to get tags from annotation
  const getTagsFromAnnotation = (annotation: Annotation): string[] => {
    if (!annotation) return [];
    
    const tags: string[] = [];
    if (isPositiveValue(annotation.self)) tags.push("Self");
    if (isPositiveValue(annotation.us)) tags.push("Us");
    if (isPositiveValue(annotation.now)) tags.push("Now");
    if (isPositiveValue(annotation.challenge)) tags.push("Challenge");
    if (isPositiveValue(annotation.choice)) tags.push("Choice");
    if (isPositiveValue(annotation.outcome)) tags.push("Outcome");
    
    return tags;
  };
  
  // Helper to check if a value is positive (1 or 2)
  const isPositiveValue = (value: string | number | undefined): boolean => {
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value === "1" || value === "2";
    return false;
  };
  
  // Create a unique key from tags to detect changes
  const getUniqueAnnotationKey = (tags: string[]): string => {
    return tags.sort().join(',');
  };
  
  // Find aligned tags between model and human annotations
  const findAlignedTags = (modelTags: string[], humanTags: string[]): string[] => {
    return modelTags.filter(tag => humanTags.includes(tag));
  };
  
  // Create blocks based on annotation differences
  const createBlocks = (
    transcript: string[],
    modelAnnotations: Annotation[],
    humanAnnotations: Annotation[]
  ): TranscriptBlock[] => {
    if (!transcript || !modelAnnotations || !humanAnnotations || 
        transcript.length === 0 || modelAnnotations.length === 0 || humanAnnotations.length === 0) {
      return [];
    }

    // Ensure all arrays have the same length by using the shortest
    const minLength = Math.min(transcript.length, modelAnnotations.length, humanAnnotations.length);
    
    const blocks: TranscriptBlock[] = [];
    let currentBlock: TranscriptBlock = {
      lineStart: 0,
      lineEnd: 0,
      text: [],
      modelTags: [],
      humanTags: []
    };

    let prevModelKey = "";
    let prevHumanKey = "";

    for (let index = 0; index < minLength; index++) {
      const line = transcript[index];
      const modelAnnotation = modelAnnotations[index];
      const humanAnnotation = humanAnnotations[index];
      
      const modelTags = getTagsFromAnnotation(modelAnnotation);
      const humanTags = getTagsFromAnnotation(humanAnnotation);
      const modelKey = getUniqueAnnotationKey(modelTags);
      const humanKey = getUniqueAnnotationKey(humanTags);

      // Start a new block if this is the first line or if any annotation has changed
      if (index === 0 || modelKey !== prevModelKey || humanKey !== prevHumanKey) {
        // Save the previous block if it's not the first line
        if (index > 0) {
          blocks.push({...currentBlock});
        }

        // Start a new block
        currentBlock = {
          lineStart: index,
          lineEnd: index,
          text: [line],
          modelTags,
          humanTags
        };
      } else {
        // Continue the current block
        currentBlock.lineEnd = index;
        currentBlock.text.push(line);
      }

      prevModelKey = modelKey;
      prevHumanKey = humanKey;
    }

    // Add the last block
    if (minLength > 0) {
      blocks.push({...currentBlock});
    }

    return blocks;
  };

  const getComputedColorForTag = (tags: string[]): string => {
    // Check for story type tags in order of priority: now > us > self
    if (tags.includes("Now")) return "#ffd700";  // Yellow
    if (tags.includes("Us")) return "#0066cc";   // Blue
    if (tags.includes("Self")) return "#8b00ff"; // Purple
    
    // If no story type tags are present, check for narrative elements
    if (tags.includes("Challenge")) return "#76b7b2"; // Keep the existing IDs for Challenge
    if (tags.includes("Choice")) return "#59a14f"; // Keep the existing IDs for Choice
    if (tags.includes("Outcome")) return "#af7aa1"; // Keep the existing IDs for Outcome
    
    return "#cccccc"; // Default gray
  };

  const blocks = createBlocks(transcript, modelAnnotations, humanAnnotations);
  
  // Process blocks to show original model and human tags separately
  const processedBlocks = blocks.map(block => {
    return {
      ...block,
      // Keep original model and human tags without alignment filtering
      modelTags: block.modelTags,
      humanTags: block.humanTags
    };
  });

  useEffect(() => {
    const updateBlockPositions = () => {
      if (!transcriptRef.current) return;
      
      const blockElements = transcriptRef.current.querySelectorAll('.transcript-row');
      const newRects: BlockRect[] = [];
      
      blockElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const parentRect = transcriptRef.current!.getBoundingClientRect();
        const relativeTop = rect.top - parentRect.top + transcriptRef.current!.scrollTop;
        
        newRects.push({
          id: index,
          top: relativeTop,
          height: rect.height
        });
      });
      
      setBlockRects(newRects);
    };
    
    // Update positions after a short delay to ensure all elements are rendered
    const timeout = setTimeout(updateBlockPositions, 100);
    
    return () => clearTimeout(timeout);
  }, [blocks]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!transcriptRef.current) return;
      
      const { scrollTop, clientHeight, scrollHeight } = transcriptRef.current;
      const start = scrollTop / scrollHeight;
      const end = (scrollTop + clientHeight) / scrollHeight;
      
      setVisibleRange({ start, end });
    };
    
    const transcriptElement = transcriptRef.current;
    if (transcriptElement) {
      transcriptElement.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial call
    }
    
    return () => {
      if (transcriptElement) {
        transcriptElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  const scrollToBlock = (index: number) => {
    if (!transcriptRef.current || blockRects.length === 0) return;
    
    const block = blockRects[index];
    if (block) {
      transcriptRef.current.scrollTop = block.top;
    }
  };

  // Helper function to determine CSS classes based on tags
  const getBlockClasses = (tags: string[]): string => {
    const classes: string[] = [];
    
    // Add story type classes
    if (tags.includes("Self")) classes.push("text-block-self");
    if (tags.includes("Us")) classes.push("text-block-us");
    if (tags.includes("Now")) classes.push("text-block-now");
    
    // Add narrative element classes
    if (tags.includes("Challenge")) classes.push("text-block-challenge");
    if (tags.includes("Choice")) classes.push("text-block-choice");
    if (tags.includes("Outcome")) classes.push("text-block-outcome");
    
    return classes.join(" ");
  };

  if (!transcript || transcript.length === 0) {
    return (
      <div className="highlighted-transcript-empty">No transcript data available</div>
    );
  }

  return (
    <div className="transcript-with-minimap">
      <div className="transcript-minimap">
        {processedBlocks.map((block, index) => {
          const blockHeight = (block.lineEnd - block.lineStart + 1) / transcript.length * 100;
          const blockTop = block.lineStart / transcript.length * 100;
          const modelColor = getComputedColorForTag(block.modelTags);
          const humanColor = getComputedColorForTag(block.humanTags);
          const isVisible = 
            (blockTop / 100 >= visibleRange.start && blockTop / 100 <= visibleRange.end) || 
            ((blockTop + blockHeight) / 100 >= visibleRange.start && (blockTop + blockHeight) / 100 <= visibleRange.end);
          
          return (
            <React.Fragment key={`minimap-${index}`}>
              <div 
                className={`minimap-block ${isVisible ? 'visible' : ''}`}
                style={{
                  height: `${blockHeight}%`,
                  top: `${blockTop}%`,
                  backgroundColor: modelColor,
                  opacity: 0.7
                }}
                onClick={() => scrollToBlock(index)}
                title={`${block.modelTags.join(', ')}`}
              />
              <div 
                className="minimap-block minimap-block-right"
                style={{
                  height: `${blockHeight}%`,
                  top: `${blockTop}%`,
                  backgroundColor: humanColor,
                  opacity: 0.7
                }}
                onClick={() => scrollToBlock(index)}
                title={`${block.humanTags.join(', ')}`}
              />
            </React.Fragment>
          );
        })}
        
        <div 
          className="minimap-viewport"
          style={{
            top: `${visibleRange.start * 100}%`,
            height: `${(visibleRange.end - visibleRange.start) * 100}%`
          }}
        />
      </div>
      
      <div className="side-by-side-transcript" ref={transcriptRef}>
        {processedBlocks.map((block, blockIndex) => (
          <div className="transcript-row" key={`block-${blockIndex}`}>
            <div className="line-number">
              {block.lineStart + 1}
            </div>
            <div className="transcript-content">
              <div className="transcript-column">
                <div 
                  className={`text-block ${getBlockClasses(block.modelTags)}`}
                  style={{ 
                    backgroundColor: getComputedColorForTag(block.modelTags),
                    color: getComputedColorForTag(block.modelTags) === "#ffd700" ? 'black' : 'white',
                    padding: '6px 10px',
                    fontSize: '15px',
                    lineHeight: '1.4',
                    textRendering: 'optimizeLegibility',
                    fontWeight: '500'
                  }}
                >
                  {block.text.join(' ')}
                </div>
              </div>
              <div className="transcript-column">
                <div 
                  className={`text-block ${getBlockClasses(block.humanTags)}`}
                  style={{ 
                    backgroundColor: getComputedColorForTag(block.humanTags),
                    color: getComputedColorForTag(block.humanTags) === "#ffd700" ? 'black' : 'white',
                    padding: '6px 10px',
                    fontSize: '15px',
                    lineHeight: '1.4',
                    textRendering: 'optimizeLegibility',
                    fontWeight: '500'
                  }}
                >
                  {block.text.join(' ')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App; 