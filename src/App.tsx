import React from 'react';
import './App.css';
import Papa from 'papaparse';
import * as d3 from 'd3';

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
      <div className="legend-divider" />
      <div className="legend-section">
        <div className="legend-item">
          <div className="legend-box" style={{ backgroundColor: 'white', border: '2px solid #666' }} />
          <span>Challenge</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{
            backgroundImage: `linear-gradient(45deg, #666 12.5%, transparent 12.5%, transparent 37.5%, #666 37.5%, #666 62.5%, transparent 62.5%, transparent 87.5%, #666 87.5%)`,
            backgroundSize: '8px 8px'
          }} />
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

function StoryDistributionGraph({ data, filters, hoveredLine, setHoveredLine, setHoverSource }: { 
  data: DataRow[], 
  filters: Filters, 
  hoveredLine: string | null,
  setHoveredLine: (line: string | null) => void,
  setHoverSource: (source: 'graph' | 'table' | null) => void
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
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 11px;
                color: ${grayColor};
                ${stripePattern}
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

    // Process data for the graph
    const processedData = data
      .map((row, index) => ({
        sequenceNumber: index + 1,
        self: Boolean(row.storyOfSelf),
        us: Boolean(row.storyOfUs),
        now: Boolean(row.storyOfNow),
        challenge: Boolean(row.challenge),
        choice: Boolean(row.choice),
        outcome: Boolean(row.outcome),
        wordCount: row.text ? row.text.trim().split(/\s+/).length : 0,
        originalRow: row,
        startIndex: index + 1,
        endIndex: index + 1
      }))
      .filter(row => row.wordCount > 0);

    // Merge consecutive blocks with same ratings
    const mergedData = processedData.reduce((acc: any[], current, index) => {
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
        .tickFormat((d: any) => '')  // Remove tick labels
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
        .attr('opacity', 0.5);
    });

    // Create the bars group
    const bars = svg.append('g');

    // Add story type bars
    dataWithPosition.forEach((d, i) => {
      const barWidth = xScale(d.wordCount) - 1;
      const x = xScale(d.position) + 1;

      const getDominantStoryType = (data: any) => {
        if (data.self) return 'self';
        if (data.us) return 'us';
        if (data.now) return 'now';
        return null;
      };

      const dominantType = getDominantStoryType(d);
      const isFiltered = matchesFilters(d.originalRow);
      // Update hover detection to check if any line in the block is hovered
      const isHovered = hoveredLine ? (() => {
        const [start, end] = hoveredLine.split(',').map(Number);
        return d.startIndex <= end && d.endIndex >= start;
      })() : false;
      const baseOpacity = isHovered ? 1 : (isFiltered ? 0.7 : 0.1);

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
            .attr('fill', 'white')
            .attr('stroke', storyColor)
            .attr('stroke-width', 2)
            .attr('opacity', isHovered ? 1 : (isFiltered ? 0.7 : 0.1));
        }

        if (d.choice) {
          bars.append('rect')
            .attr('class', 'choice-overlay')
            .attr('x', x)
            .attr('y', 2)
            .attr('width', barWidth)
            .attr('height', barHeight - 4)
            .attr('fill', `url(#choice-pattern-${dominantType})`)
            .attr('opacity', isHovered ? 1 : (isFiltered ? 0.7 : 0.1));
        }

        if (d.outcome) {
          bars.append('rect')
            .attr('class', 'outcome-overlay')
            .attr('x', x)
            .attr('y', 2)
            .attr('width', barWidth)
            .attr('height', barHeight - 4)
            .attr('fill', storyColor)
            .attr('opacity', isHovered ? 1 : (isFiltered ? 0.7 : 0.1));
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

    // Add gray pattern for choice
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

  }, [data, filters, hoveredLine, setHoveredLine, setHoverSource]);

  return (
    <div className="graph-container">
      <Legend />
      <div className="graph-svg-container">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}

function StoryStatistics({ data }: { data: DataRow[] }) {
  // Calculate percentages
  const totalRows = data.length;
  const stats = {
    self: data.filter(row => row.storyOfSelf).length / totalRows * 100,
    us: data.filter(row => row.storyOfUs).length / totalRows * 100,
    now: data.filter(row => row.storyOfNow).length / totalRows * 100,
    challenge: data.filter(row => row.challenge).length / totalRows * 100,
    choice: data.filter(row => row.choice).length / totalRows * 100,
    outcome: data.filter(row => row.outcome).length / totalRows * 100,
    noStoryType: data.filter(row => !row.storyOfSelf && !row.storyOfUs && !row.storyOfNow).length / totalRows * 100,
    noNarrativeElement: data.filter(row => !row.challenge && !row.choice && !row.outcome).length / totalRows * 100
  };

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
  const [filteredData, setFilteredData] = React.useState<DataRow[]>([]);
  const [selectedStory, setSelectedStory] = React.useState<string>('');
  const [allStories, setAllStories] = React.useState<{[key: string]: DataRow[]}>({});
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
      { name: 'Maung', file: `${process.env.PUBLIC_URL}/Pedja_codes.csv`, available: true },
      { name: 'Kamala 1', file: `${process.env.PUBLIC_URL}/Kamala1.csv`, available: true },
      { name: 'Kamala 2', file: `${process.env.PUBLIC_URL}/Kamala2.csv`, available: true },
      { name: 'Tim 1', file: `${process.env.PUBLIC_URL}/Tim1.csv`, available: true },
      { name: 'Tim 2', file: `${process.env.PUBLIC_URL}/Tim2.csv`, available: true }
    ];

    Promise.all(storyFiles.map(story => 
      fetch(story.file)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load ${story.file}: ${response.statusText}`);
          }
          return response.text();
        })
        .then(csvText => {
          console.log(`Loading ${story.name}'s data...`);
          console.log(`CSV text length for ${story.name}:`, csvText.length);
          const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
          });
          
          console.log(`Raw parsed data for ${story.name}:`, results.data.length, 'rows');
          console.log(`Column headers for ${story.name}:`, Object.keys(results.data[0] || {}));

          const processedData = (results.data as any[])
            .map((row, index) => ({
              lineNumber: (index + 1).toString(),
              text: row['Text'] ? row['Text'].replace(/^["'\s]+|["'\s]+$/g, '').trim() : '',
              storyOfSelf: row['Story of Self'] || row['Story of Self (Origin)'] || '',
              storyOfUs: row['Story of Us'] || '',
              storyOfNow: row['Story of Now'] || '',
              challenge: row['Challenge'] || '',
              choice: row['Choice'] || '',
              outcome: row['Outcome'] || '',
              specificDetails: row['Specific/Vivid Details'] || '',
              hope: row['Hope'] || '',
              values: row['Values'] || '',
              vulnerability: row['Vulnerability'] || '',
              thirdPersonContent: row['Third-Person Content'] || '',
              codingNotes: row['Coding Notes'] || ''
            }))
            .filter(row => {
              const hasText = row.text.length > 0 && row.text !== 'Wow.' && row.text !== 'Thank you.' && row.text !== 'Absolutely.';
              const originalRow = results.data[parseInt(row.lineNumber) - 1] as { Text?: string };
              if (!hasText && originalRow?.Text) {
                console.log(`Filtered out row ${row.lineNumber} with text:`, originalRow.Text);
              }
              return hasText;
            });

          console.log(`Processed ${story.name}'s data: ${processedData.length} rows`);
          if (processedData.length === 0) {
            console.log(`Warning: ${story.name} has 0 rows after processing. First raw row:`, results.data[0]);
          }
          return { name: story.name, data: processedData };
        })
    ))
    .then(results => {
      const storiesData = results.reduce((acc, { name, data }) => {
        acc[name] = data;
        return acc;
      }, {} as {[key: string]: DataRow[]});
      
      console.log('All stories loaded. Available stories:', Object.keys(storiesData));
      setAllStories(storiesData);
      setData([]);
    })
    .catch(error => {
      console.error('Error loading CSV files:', error);
    });
  }, []);

  // Handle story selection
  const handleStoryChange = (storyName: string) => {
    console.log('Switching to story:', storyName); // Debug log
    console.log('Available stories:', allStories); // Debug log
    setSelectedStory(storyName);
    const newData = allStories[storyName] || [];
    console.log('New data for story:', newData); // Debug log
    setData(newData);
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
  const findBlockForLine = (lineNumber: number, processedData: any[]): [number, number] | null => {
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
        self: Boolean(row.storyOfSelf),
        us: Boolean(row.storyOfUs),
        now: Boolean(row.storyOfNow),
        challenge: Boolean(row.challenge),
        choice: Boolean(row.choice),
        outcome: Boolean(row.outcome),
      }))
      .reduce((acc: any[], current) => {
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

      <StoryDistributionGraph 
        data={data} 
        filters={filters} 
        hoveredLine={hoveredLine}
        setHoveredLine={setHoveredLine}
        setHoverSource={setHoverSource}
      />

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
    </div>
  );
}

export default App; 