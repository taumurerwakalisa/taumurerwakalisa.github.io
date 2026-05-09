// Genre data with approximate game counts (used for sizing)
const genreData = [
    { name: 'Action', count: 2956, color: '#FF6B35' },
    { name: 'Adventure', count: 910, color: '#F7931E' },
    { name: 'Fighting', count: 784, color: '#E63946' },
    { name: 'Misc', count: 1530, color: '#9B59B6' },
    { name: 'Platform', count: 832, color: '#3498DB' },
    { name: 'Puzzle', count: 483, color: '#E74C3C' },
    { name: 'Racing', count: 1117, color: '#E74C3C' },
    { name: 'Role-playing', count: 1349, color: '#E74C3C' },
    { name: 'Shooter', count: 1172, color: '#E74C3C' }, 
    { name: 'Simulation', count: 752, color: '#E74C3C' }, 
    { name: 'Sports', count: 2170, color: '#95A5A6' },
    { name: 'Strategy', count: 683, color: '#1ABC9C' }
];


/** COLORS 
 * const GENRE_COUNTS = [
    { name: 'Action', count: 2956, color: "#1f77b4" },
    { name: 'Adventure', count: 910, color: "#8c564b" },
    { name: 'Fighting', count: 784, color: "#e377c2"},
    { name: 'Misc', count: 1530, color: "#7f7f7f" },
    { name: 'Platform', count: 832, color: "#2ca02c" },
    { name: 'Puzzle', count: 483, color: "#bcbd22" },
    { name: 'Racing', count: 1117, color: "#ff7f0e" },
    { name: 'Role-playing', count: 1349, color: "#9467bd" },
    { name: 'Shooter', count: 1172, color: "#7d2828"}, 
    { name: 'Simulation', count: 752, color: "#17becf" }, 
    { name: 'Sports', count: 2170, color: "#d62728" },
    { name: 'Strategy', count: 683, color: "#393b79" }
];
 */

// Configuration
const config = {
    minRadius: 95,
    maxRadius: 150,
    padding: 20
};

// Select SVG
const svg = d3.select("#hexagon-container");

// Calculate total games
const totalGames = d3.sum(genreData, d => d.count);

// Create scale for hexagon radius based on game count
const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(genreData, d => d.count)])
    .range([config.minRadius, config.maxRadius]);

// Add radius to data
genreData.forEach(d => {
    d.radius = radiusScale(d.count);
    d.percentage = ((d.count / totalGames) * 100).toFixed(1);
});

// Function to generate hexagon path
function createHexagonPath(radius) {
    const points = [];
    
    // Calculate 6 vertices of hexagon
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - (Math.PI / 2);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        points.push([x, y]);
    }
    
    // Create SVG path string
  // M = move to first point, L = line to next points, Z = close path
    return "M" + points.join("L") + "Z";
}

// Pack hexagons using force simulation to avoid overlap
const simulation = d3.forceSimulation(genreData)
    .force("x", d3.forceX(500).strength(0.05))
    .force("y", d3.forceY(400).strength(0.05))
    .force("collide", d3.forceCollide(d => d.radius + config.padding))
    .stop();

// Run simulation manually
for (let i = 0; i < 300; i++) {
    simulation.tick();
}

// Calculate bounds after simulation
const xExtent = d3.extent(genreData, d => d.x);
const yExtent = d3.extent(genreData, d => d.y);
const maxRadius = d3.max(genreData, d => d.radius);

// Add padding around the visualization
const margin = maxRadius + 40;

// Calculate dynamic dimensions to allow hexagons not being cut off
const dynamicWidth = xExtent[1] - xExtent[0] + (2 * margin);
const dynamicHeight = yExtent[1] - yExtent[0] + (2 * margin);

// Adjust positions to account for the offset
genreData.forEach(d => {
    d.x = d.x - xExtent[0] + margin;
    d.y = d.y - yExtent[0] + margin;
});

// Update SVG viewBox with dynamic dimensions
svg.attr("viewBox", `0 0 ${dynamicWidth} ${dynamicHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// Create group for each hexagon
const hexGroups = svg.selectAll("g.hex-group")
    .data(genreData)
    .enter()
    .append("g")
    .attr("class", "hex-group")
    .attr("transform", d => `translate(${d.x}, ${d.y})`);

// Draw hexagons
hexGroups.append("path")
    .attr("class", "hexagon")
    .attr("d", d => createHexagonPath(d.radius))
    .attr("fill", d => d.color)
    .style("filter", "drop-shadow(0 0 8px rgba(0,0,0,0.3))")
    .style("cursor", "pointer")
    .on("mouseover", handleMouseOver)
    .on("mousemove", handleMouseMove)
    .on("mouseout", handleMouseOut);



// Add genre labels 
hexGroups.append("text")
    .attr("class", "genre-label")
    .attr("dy", "-0.5em")  // Position above center
    .attr("text-anchor", "middle")
    .style("font-family", "Orbitron, sans-serif")
    .style("font-size", d => `${d.radius * 0.15}px`)  // Scale with hexagon size
    .style("font-weight", "700")
    .style("text-transform", "uppercase")
    .style("letter-spacing", "0.1em")
    .style("fill", "#fff")
    .style("text-shadow", "0 2px 8px rgba(0, 0, 0, 0.6)")
    .style("pointer-events", "none")
    .text(d => d.name);

// Add count labels  
hexGroups.append("text")
    .attr("class", "count-label")
    .attr("dy", "1em")  // Position below center
    .attr("text-anchor", "middle")
    .style("font-family", "Rajdhani, sans-serif")
    .style("font-size", d => `${d.radius * 0.14}px`)  // Smaller, scales with size
    .style("font-weight", "500")
    .style("fill", "rgba(255, 255, 255, 0.9)")
    .style("letter-spacing", "0.05em")
    .style("pointer-events", "none")
    .text(d => `${d.count.toLocaleString()} games`);

// Tooltip element
const tooltip = d3.select("#tooltip");

// Event handlers
function handleMouseOver(event, d) {
    // Highlight hexagon
    d3.select(this)
        .transition()
        .duration(300)
        .style("filter", `drop-shadow(0 0 25px ${d.color})`)
        .attr("transform", "scale(1.05)");
    
    /*// Show tooltip 
    tooltip.classed("visible", true)
        .html(`
            <div class="tooltip-genre">${d.name}</div>
            <div class="tooltip-count">${d.count.toLocaleString()} games</div>
            <div class="tooltip-percentage">${d.percentage}% of total</div>
        `);*/
}

function handleMouseMove(event) {
    // Position tooltip near cursor
    tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 15) + "px");
}

function handleMouseOut(event, d) {
    // Reset hexagon
    d3.select(this)
        .transition()
        .duration(200)
        .style("filter", "drop-shadow(0 0 8px rgba(0,0,0,0.3))")
        .attr("transform", "scale(1)");
    
    // Hide tooltip
   // tooltip.classed("visible", false);
}

// Add entrance animation
hexGroups
    .style("opacity", 0)
    .transition()
    .duration(800)
    .delay((d, i) => i * 50)
    .style("opacity", 1);




//---------------BUTTON SELECTION PART----------------------------
// Add at the top after genreData
let selectedGenres = new Set();

// After creating hexGroups, add selection functionality
hexGroups
  .style("cursor", "pointer")
  .on("click", handleHexagonClick);

// Selection handler
function handleHexagonClick(event, d) {
  event.stopPropagation();
  
  if (selectedGenres.has(d.name)) {
    // Deselect
    selectedGenres.delete(d.name);
    d3.select(this).select("path")
      .transition()
      .duration(300)
      .attr("stroke", "none")
      .attr("stroke-width", 0)
      .style("filter", "drop-shadow(0 0 8px rgba(0,0,0,0.3))");
  } else {
    // Select
    selectedGenres.add(d.name);
    d3.select(this).select("path")
      .transition()
      .duration(300)
      .attr("stroke", "#FFD700")
      .attr("stroke-width", 5)
      .style("filter", `drop-shadow(0 0 20px ${d.color})`);
  }
  
  updateViewButton();
}

// Update button state
function updateViewButton() {
  const button = d3.select("#view-treemap-btn");
  
  if (selectedGenres.size > 0) {
    button
      .attr("disabled", null)
      .style("opacity", 1)
      .style("cursor", "pointer")
      .text(`View ${selectedGenres.size} Genre${selectedGenres.size > 1 ? 's' : ''}`);
  } else {
    button
      .attr("disabled", true)
      .style("opacity", 0.5)
      .style("cursor", "not-allowed")
      .text("Select a Genre");
  }
}

// Navigate to treemap
function viewTreemap() {
  if (selectedGenres.size === 0) return;
  
  // Convert Set to array and encode as URL parameter
  const genres = Array.from(selectedGenres).join(',');
  window.location.href = `treemap.html?genres=${encodeURIComponent(genres)}`;
}

// Initialize button
d3.select("#view-treemap-btn").on("click", viewTreemap);
updateViewButton();



// Add to main.js
d3.select("#clear-selection-btn").on("click", function() {
    selectedGenres.clear();
    
    // Remove all selection styles
    hexGroups.selectAll("path")
      .transition()
      .duration(300)
      .attr("stroke", "none")
      .attr("stroke-width", 0)
      .style("filter", "drop-shadow(0 0 8px rgba(0,0,0,0.3))");
    
    updateViewButton();
});