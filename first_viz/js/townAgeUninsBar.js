class TownUninsByAgeChart {

  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 600,
      containerHeight: _config.containerHeight || 350,
      margin: _config.margin || {top: 40, right: 30, bottom: 60, left: 100},
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
       .attr("height", vis.config.containerHeight)
    
    vis.chart = vis.svg.append("g")
       .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

    // Color scale - one color per age group
    vis.colorScale = d3.scaleOrdinal()
       .domain(["Under 18", "19-25", "26-34", "35-64", "65+"])      
       .range(["#1A5276", "#2E86C1", "#85C1E9", "#F0A500", "#C0392B"]);
       

    // X scale - share of uninsured population (percentage)
    vis.xScale = d3.scaleLinear()
       .range([0, vis.width]);

    // Y scale - towns (categorical)
    vis.yScale = d3.scaleBand()
       .range([0, vis.height])
       .padding(0.3);

    // Axis Groups
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
       .text("Uninsurance Rates by Age, North Mecklenburg 2024");


    // Axis labels
    vis.svg.append("text")
       .attr("class", "axis-label")
       .attr("x", vis.config.margin.left + vis.width / 2)
       .attr("y", vis.config.containerHeight - 20)
       .attr("text-anchor", "middle")
       .style("font-size", "0.85rem")
       .style("fill", "#1B4F72")
       .text("Share of uninsured population (%)");

    vis.svg.append("text")
       .attr("class", "axis-label")
       .attr("x", -(vis.config.margin.top + vis.height / 2))
       .attr("y", 20)
       .attr("transform", "rotate(-90)")
       .attr("text-anchor", "middle")
       .style("font-size", "0.85rem")
       .style("fill", "#1B4F72")
       .text("Town");

    vis.updateVis(); 
  }



  updateVis() {
    let vis = this; 

    // Calculate each age group's share of the town's total uninsured population 

    // First, get the unique towns
    const towns = [...new Set(vis.data.map(d => d.Town))]

    vis.chartData = towns.map(town => {
        //Find the row for a town (one row per town)
        const row = vis.data.find(d => d.Town === town); 

        const u18_UninsRate = (row.unins_U18 / row.all_unins) * 100;
        const adultUnins_19_25 = row.unins_19_25; // Use row because we fetched data for each town above
        const adultUnins_26_34 = row.unins_26_34;
        const adultUnins_35_64 = row.unins_35_64;
        const adultUnins_19_25_Rate = (adultUnins_19_25 / row.all_unins) * 100;
        const adultUnins_26_34_Rate = (adultUnins_26_34 / row.all_unins) * 100;
        const adultUnins_35_64_Rate = (adultUnins_35_64 / row.all_unins) * 100;
        const over65UninsRate = (row.unins_65_over / row.all_unins) * 100; 

        return {
            town: town,
            "Under 18": u18_UninsRate, 
            "19-25": adultUnins_19_25_Rate,
            "26-34": adultUnins_26_34_Rate,
            "35-64": adultUnins_35_64_Rate,
            "65+": over65UninsRate
        };
    });


    // Stack the data from above
    vis.stack = d3.stack()
       .keys(["Under 18", "19-25", "26-34", "35-64", "65+"]);

    vis.stackedData = vis.stack(vis.chartData); 

    // Set scale domains
    vis.xScale.domain([0, 100]);
    vis.yScale.domain(vis.chartData.map(d => d.town));

    vis.renderVis(); 

  }



  renderVis() {
    let vis = this;

    // Draw the stacked bars
    vis.chart.selectAll("g.layer")
       .data(vis.stackedData)
       .join("g")
       .attr("class", "layer")
       .attr("fill", d => vis.colorScale(d.key))
       .selectAll("rect")
       .data(d => d)
       .join("rect")
       .attr("y", d => vis.yScale(d.data.town))
       .attr("x", d => vis.xScale(d[0]))
       .attr("width", d => vis.xScale(d[1]) - vis.xScale(d[0]))
       .attr("height", vis.yScale.bandwidth())
       .on("mouseover", function(event, d) {
          let value = (d[1] - d[0]).toFixed(1);
          let label = d3.select(this.parentNode).datum().key;
          vis.tooltip
             .style("opacity", 1)
             .html(`<strong>${label}</strong>: ${value}% of uninsured population`);
       })
       .on("mousemove", function(event) {
          vis.tooltip  
             .style("left", (event.pageX + 12) + "px")
             .style("top", (event.pageY - 28) + "px");
       })
       .on("mouseout", function() {
          vis.tooltip.style("opacity", 0);
       });

       // Update axes
       vis.xAxisG.call(d3.axisBottom(vis.xScale)
          .tickValues([0, 25, 50, 75, 100])
          .tickFormat(d => d + "%"));

       vis.yAxisG.call(d3.axisLeft(vis.yScale));

       
       // Legend
       const legend = vis.svg.selectAll(".legend")
            .data(["Under 18", "19-25", "26-34", "35-64", "65+"])
            .join("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${vis.config.margin.left + i * 90}, ${vis.config.containerHeight - 10})`);

        legend.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", d => vis.colorScale(d));

        legend.append("text")
            .attr("x", 16)
            .attr("y", 10)
            .style("fill", "#1B4F72")
            .style("font-size", "0.8rem")
            .text(d => d);
  }

}