class AgeUninsTrendChart {

  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 650,
      containerHeight: _config.containerHeight || 420,
      margin: _config.margin || {top: 40, right: 100, bottom: 50, left: 60},
      dispatcher: _config.dispatcher
    }
    this.data = _data;
    this.initVis();
  }


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

    // Color scale - one color per age group
    vis.colorScale = d3.scaleOrdinal()
       .domain(["Under 18", "19-64", "65+", "Total population"])
       .range(["#2E86AB", "#1B4F72", "#E8A838", "#7B7D7D"]);

    // X scale - years (categorical, since they're not evenly spaced)
    vis.xScale = d3.scalePoint() // COME BACK TO THIS!!!!!
       .range([0, vis.width])
       .padding(0.5);

    // Y scale - uninsured percentage
    vis.yScale = d3.scaleLinear()
       .range([vis.height, 0]);

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
       .text("Uninsurance Rate By age Over Time");

    // Axis labels
    vis.svg.append("text")
       .attr("class", "axis-label")
       .attr("x", vis.config.margin.left + vis.width / 2)
       .attr("y", vis.config.containerHeight - 10)
       .attr("text-anchor", "middle")
       .style("font-size", "0.85rem")
       .style("fill", "#1B4F72")
       .text("Year");

    vis.svg.append("text")
       .attr("class", "axis-label")
       .attr("x", -(vis.config.margin.top + vis.height / 2))
       .attr("y", 15)
       .attr("transform", "rotate(-90)")
       .attr("text-anchor", "middle")
       .style("font-size", "0.85rem")
       .style("fill", "#1B4F72")
       .text("Uninsured rate (%)");

    vis.updateVis();
  }


  updateVis() {
    let vis = this; 

    // Sort the data by year
    const sortedData = [...vis.data].sort((a,b) => a.year - b.year);

    // For each year, calculate the uninsurance rates for each age group and store it in one place
    const yearlyUninsRates = sortedData.map(d => {
        const u18Rate = (d.unins_U18 / (d.ins_U18 + d.unins_U18)) * 100; 
        const adultIns_19_64 = d.ins_19_25 + d.ins_26_34 + d.ins_35_64;
        const adultUnins_19_64 = d.unins_19_25 + d.unins_26_34 + d.unins_35_64;
        const unins_19_64Rate =  (adultUnins_19_64 / (adultIns_19_64 + adultUnins_19_64)) * 100; 
        const over65UninsRate = (d.unins_65_over / (d.ins_65_over + d.unins_65_over)) * 100;
        const totalUninsRate = (d.all_unins / (d.all_ins + d.all_unins)) * 100;

    return {
        year: d.year, 
        "Under 18": u18Rate,
        "19-64": unins_19_64Rate,
        "65+": over65UninsRate,
        "Total population": totalUninsRate
    };
   });


   // Reshape the data into one array per group, each containing {year, value} points
   const groups = ["Under 18", "19-64", "65+", "Total population"];

   vis.chartData = groups.map(group => ({
    group: group,
    values: yearlyUninsRates.map(d => ({ year: d.year, value: d[group] }))
   }));

   // Set scale domains
   vis.xScale.domain(yearlyUninsRates.map(d => d.year));

   const allRates = yearlyUninsRates.flatMap(d => groups.map(g => d[g]));
   vis.yScale.domain([0, d3.max(allRates) * 1.2]);

   vis.renderVis();

  }


  renderVis() {
    let vis = this; 

    // Line generator - reusable function for any group's array of points
    const lineGenerator = d3.line()
       .x(d => vis.xScale(d.year))
       .y(d => vis.yScale(d.value));

    // Draw one line per group
    vis.chart.selectAll(".trend-line")
       .data(vis.chartData)
       .join("path")
       .attr("class", "trend-line")
       .attr("fill", "none")
       .attr("stroke", d => vis.colorScale(d.group))
       .attr("stroke-width", 2.5)
       .attr("d", d => lineGenerator(d.values));

    // Draw dots for each group, for every year
    vis.chartData.forEach(function(groupData) {
        vis.chart.selectAll(`.dot-${groupData.group.replace(/\s|\+/g, "")}`)
           .data(groupData.values)
           .join("circle")
           .attr("class", `dot-${groupData.group.replace(/\s|\+/g, "")}`)
           .attr("cx", d => vis.xScale(d.year))
           .attr("cy", d => vis.yScale(d.value))
           .attr("r", 4)
           .attr("fill", vis.colorScale(groupData.group))
           .on("mouseover", function(event, d) {
              vis.tooltip 
                 .style("opacity", 1)
                 .html(`<strong>${groupData.group}</strong> (${d.year}): ${d.value.toFixed(1)}%`);
           })
           .on("mousemove", function(event) {
              vis.tooltip  
                 .style("left", (event.pageX + 12) + "px")
                 .style("top", (event.pageY - 28) + "px");
           })
           .on("mouseout", function() {
              vis.tooltip.style("opacity", 0);
           });
    });

    // Line-end labels - one per group, positioned at the last data point
    vis.chart.selectAll(".line-label")
       .data(vis.chartData)
       .join("text")
       .attr("class", "line-label")
       .attr("x", d => vis.xScale(d.values[d.values.length - 1].year) + 8)
       .attr("y", d => vis.yScale(d.values[d.values.length - 1].value))
       .attr("dy", "0.35em")
       .style("font-size", "0.75rem")
       .style("fill", d => vis.colorScale(d.group))
       .text(d => d.group);


    // In case there are overlapping line-end labels
    const labelPositions = vis.chartData.map(d => ({
        group: d.group,
        y: vis.yScale(d.values[d.values.length - 1].value)
    })).sort((a, b) => a.y - b.y);

    const minGap = 14; // minimum pixels between labels
    for (let i = 1; i < labelPositions.length; i++) {
        if (labelPositions[i].y - labelPositions[i - 1].y < minGap) {
            labelPositions[i].y = labelPositions[i - 1].y + minGap;
        }
    }

    // Apply the adjusted positions back to the labels
    vis.chart.selectAll(".line-label")
       .attr("y", function(d) {
          const adjusted = labelPositions.find(l => l.group === d.group);
          return adjusted.y;
    });



    // Update axes
    vis.xAxisG.call(d3.axisBottom(vis.xScale));
    vis.yAxisG.call(d3.axisLeft(vis.yScale).tickFormat(d => d + "%"));

  }

} // End of overall class