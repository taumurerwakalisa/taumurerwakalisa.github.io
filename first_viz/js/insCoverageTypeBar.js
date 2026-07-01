class CoverageTypeBar {

  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 590,
      containerHeight: _config.containerHeight || 380,
      margin: _config.margin || {top: 40, right: 30, bottom: 80, left: 60},
      dispatcher: _config.dispatcher
    }
    this.data = _data;
    this.initVis();
  }


  /**
   * Initialize svg, scales, and axes
   */

  initVis() {
  let vis = this;

  vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
  vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

  vis.svg = d3.select(vis.config.parentElement)
    .append("svg")
    .attr("width", vis.config.containerWidth)
    .attr("height", vis.config.containerHeight);

  vis.chart = vis.svg.append("g")
    .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

  // X scale - insurance types (categorical)
  vis.xScale = d3.scaleBand()
    .range([0, vis.width])
    .padding(0.3);

  // Y scale - percentage (continuous)
  vis.yScale = d3.scaleLinear()
    .range([vis.height, 0]);

  // Color scale - one color per insurance type
  vis.colorScale = d3.scaleOrdinal()
    .range(["#1B4F72", "#2E86AB", "#5DADE2", "#90C7E3", "#E8A838", "#D4AC0D", "#A93226", "#7B7D7D"]);

  // Gridlines group - drawn BEFORE axes so bars sit on top
  vis.gridG = vis.chart.append("g")
     .attr("class", "grid");

  // Axis groups
  vis.xAxisG = vis.chart.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0, ${vis.height})`);

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
     .text("Health Insurance Type Coverage, 2024");




  /**
  * Axis labels
  */

  // X axis
  vis.svg.append("text")
    .attr("class", "axis-label")
    .attr("x", vis.config.margin.left + vis.width / 2)
    .attr("y", vis.config.containerHeight - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "0.85rem")
    .style("fill", "#1B4F72")
    .text("Type of Insurance");      


  // Y axis
  vis.svg.append("text")
    .attr("class", "axis-label")
    .attr("x", -(vis.config.margin.top + vis.height / 2))
    .attr("y", 20)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "0.85rem")
    .attr("fill", "#1B4F72")
    .text("Percent Covered");


  vis.updateVis();
}



  updateVis() {
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

  vis.chartData = insuranceTypes.map(type => ({
    category: type.label,
    value: (vis.data[0][type.key] / vis.data[0].Tot_pop) * 100
  }));

  // Set scale domains
  vis.xScale.domain(vis.chartData.map(d => d.category));
  vis.yScale.domain([0, d3.max(vis.chartData, d => d.value) * 1.2]);
  vis.colorScale.domain(vis.chartData.map(d => d.category));

  vis.renderVis();
}


  renderVis() {
  let vis = this;

  // Draw the background horizontal grid lines
  vis.gridG
     .call(d3.axisLeft(vis.yScale)
        .tickSize(-vis.width)
        .tickFormat("")
        )
     .call(g => g.select(".domain").remove())
     .call(g => g.selectAll(".tick line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "3,3")
      );

  // Draw bars
  vis.chart.selectAll(".coverage-bar")
    .data(vis.chartData)
    .join("rect")
    .attr("class", "coverage-bar")
    .attr("x", d => vis.xScale(d.category))
    .attr("y", d => vis.yScale(d.value))
    .attr("width", vis.xScale.bandwidth())
    .attr("height", d => vis.height - vis.yScale(d.value))
    .attr("fill", d => vis.colorScale(d.category))
    .on("mouseover", function(event, d) {
      vis.tooltip
        .style("opacity", 1)
        .html(`<strong>${d.category}</strong>: ${d.value.toFixed(1)}%`);
    })
    .on("mousemove", function(event) {
      vis.tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      vis.tooltip.style("opacity", 0);
    });

  // Value labels on top of bars
  vis.chart.selectAll(".bar-label")
    .data(vis.chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => vis.xScale(d.category) + vis.xScale.bandwidth() / 2)
    .attr("y", d => vis.yScale(d.value) - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "0.75rem")
    .style("fill", "#1B4F72")
    .text(d => d.value.toFixed(1) + "%");

  // Update axes
  vis.xAxisG.call(d3.axisBottom(vis.xScale))
    .selectAll("text")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  vis.yAxisG.call(d3.axisLeft(vis.yScale).tickFormat(d => d + "%"));
}

} // End of class 