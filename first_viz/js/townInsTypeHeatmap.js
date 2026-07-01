class TownHeatmap {

  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 900,
      containerHeight: _config.containerHeight || 350,
      margin: _config.margin || {top: 60, right: 30, bottom: 30, left: 140},
      dispatcher: _config.dispatcher
    }
    this.data = _data;
    this.initVis();
  }


  /**
   * Initialize scales and axes
   */

  initVis(){
    let vis = this;
    
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Append svg to drawing area
    vis.svg = d3.select(vis.config.parentElement)
       .append("svg")
       .attr("width", vis.config.containerWidth)
       .attr("height", vis.config.containerHeight);

    vis.chart = vis.svg.append("g")
    .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

    // X scale - Insurance types (columns)
    vis.xScale = d3.scaleBand()
    .range([0, vis.width])
    .padding(0.05);

    // Y scale - towns (rows)
    vis.yScale = d3.scaleBand()
       .range([0, vis.height])
       .padding(0.05);

    // Color scale - intensity based on percentage
    vis.colorScale = d3.scaleSequential(d3.interpolateBlues)
       .domain([0, 70]);

    // Axis groups
    vis.xAxisG = vis.chart.append("g")
       .attr("class", "axis x-axis")
       .attr("transform", `translate(0, 0)`);

    vis.yAxisG = vis.chart.append("g")
       .attr("class", "axis y-axis");

    // Tooltip
    vis.tooltip = d3.select(vis.config.parentElement)
       .append("div")
       .attr("class", "tooltip")
       .style("opacity", 0)
       .style("position", "absolute")
       .style("pointer-events", "none");

    // Chart Title
    vis.svg.append("text")
       .attr("class", "chart-title")
       .attr("x", vis.config.margin.left + vis.width / 2)
       .attr("y", 20)
       .attr("text-anchor", "middle")
       .style("font-size", "1rem")
       .style("font-weight", "600")
       .style("fill", "#1B4F72")
       .text("Health Insurance Type Heatmap, North Mecklenburg 2024");

    vis.updateVis();
  }


  updateVis(){
    let vis = this;

    const insuranceTypes = [
    { key: "emp_based_ins", label: "Employer-based" },
    { key: "dir_purchase_ins", label: "Direct-purchase" },
    { key: "medicare_cov", label: "Medicare" },
    { key: "medicaid_cov", label: "Medicaid" },
    { key: "tricare_cov", label: "Tricare" },
    { key: "VA_cov", label: "VA" },
    { key: "other_cov_type", label: "Other" },
    { key: "all_unins", label: "Uninsured" }
  ];


    // Build a flat array of {town, type, value} for every cell in the grid
    vis.chartData = [];

    vis.data.forEach(d => {
        insuranceTypes.forEach(type => {
            vis.chartData.push({
                town: d.Town,
                type: type.label,
                value: (d[type.key] / d.Tot_pop) * 100
            });
        });
    });

    // Set scale domains
    vis.xScale.domain(insuranceTypes.map(t => t.label));
    vis.yScale.domain(vis.data.map(d => d.Town));

    vis.renderVis(); 
  }


  /**
   * Append data to visual elements
   */

  renderVis(){
    let vis = this;

    // Draw heatmap cells
    vis.chart.selectAll(".heatmap-cell")
       .data(vis.chartData)
       .join("rect")
       .attr("class", "heatmap-cell")
       .attr("x", d => vis.xScale(d.type))
       .attr("y", d => vis.yScale(d.town))
       .attr("width", vis.xScale.bandwidth())
       .attr("height", vis.yScale.bandwidth())
       .attr("rx", 6)
       .attr("fill", d => vis.colorScale(d.value))
       .on("mouseover", function(event, d) {
          vis.tooltip 
             .style("opacity", 1)
             .html(`<strong>${d.town} - ${d.type}</strong>: ${d.value.toFixed(1)}%`);
       })
       .on("mousemove", function(event){
          vis.tooltip  
             .style("left", (event.pageX + 12) + "px")
             .style("top", (event.pageY - 28) + "px");
       })
       .on("mouseout", function() {
        vis.tooltip.style("opacity", 0);
       })

       // Add percentage labels inside each cell
       vis.chart.selectAll(".heatmap-label")
          .data(vis.chartData)
          .join("text")
          .attr("class", "heatmap-label")
          .attr("x", d => vis.xScale(d.type) + vis.xScale.bandwidth() / 2)
          .attr("y", d => vis.yScale(d.town) + vis.yScale.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .style("font-size", "0.8rem")
          .style("fill", d => d.value > 35 ? "white" : "#1B4F72")
          .text(d => d.value.toFixed(1) + "%");

    
       // Color scale legend
       const legendWidth = 200;
       const legendHeight = 12;

       const legendG = vis.svg.append("g")
          .attr("class", "color-legend")
          .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.containerHeight - 12})`);

       // Create gradient definition
       const defs = vis.svg.append("defs");
       const gradient = defs.append("linearGradient")
          .attr("id", "heatmap-gradient")
          .attr("x1", "0%")
          .attr("x2", "100%");

       // Add color stops based on the color scale domain
       const stops = d3.range(0, 1.01, 0.1);
       stops.forEach(stop => {
          gradient.append("stop")
                  .attr("offset", `${stop * 100}%`)
                  .attr("stop-color", vis.colorScale(stop * vis.colorScale.domain()[1]));
       });

       // Draw the gradient rectangle
       legendG.append("rect")
              .attr("width", legendWidth)
              .attr("height", legendHeight)
              .attr("rx", 4)
              .style("fill", "url(#heatmap-gradient)");

        // Add "Low %" label
        legendG.append("text")
               .attr("x", -50)
               .attr("y", 6)
               .style("font-size", "0.75rem")
               .style("fill", "#1B4F72")
               .text("Low %");

        // Add "High %" label
        legendG.append("text")
               .attr("x", legendWidth + 50)
               .attr("y", 7)
               .attr("text-anchor", "end")
               .style("font-size", "0.75rem")
               .style("fill", "#1B4F72")
               .text("High %");
 



       // Update axes
       vis.xAxisG.call(d3.axisTop(vis.xScale).tickSize(0));
       vis.yAxisG.call(d3.axisLeft(vis.yScale).tickSize(0));

       vis.xAxisG.select(".domain").remove();
       vis.yAxisG.select(".domain").remove();
  }



} // End of the class