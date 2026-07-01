class DiabetesChart {
    constructor(_config, _data) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 420,
        containerHeight: _config.containerHeight || 300,
        margin: _config.margin || {top: 40, right: 20, bottom: 50, left: 55},
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

        // Add a color scale for the bars (different colors for different years)
        vis.colorScale = d3.scaleOrdinal()
           //.range(["#C0392B", "#1A7A7A", "#E67E22"]);
           .range(["#2E86AB", "#1B4F72", "#E8A838"]);
        
        // X scale - Categorical (Years)
        vis.xScale = d3.scaleBand()
           .range([0, vis.width])
           .padding(0.4);
        
        // Y scale - Percentage
        vis.yScale = d3.scaleLinear()
           .range([vis.height, 0])


        // Gridlines group - drawn BEFORE axes so bars sit on top
        vis.gridG = vis.chart.append("g")
           .attr("class", "grid");

        // Axis groups       
        vis.xAxisG = vis.chart.append("g")
           .attr("class", "axix x-axis")
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
           .text("Age-adjusted Diabetes Prevalence");

           
        // Axis labels 
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", vis.config.margin.left + vis.width / 2)
           .attr("y", vis.config.containerHeight - 15)
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
           .text("Diabetes prevalence (%)");
 
        vis.updateVis();
    }



    updateVis() {
        let vis = this; 

        console.log(vis.data.filter(d => d.MeasureId === "DIABETES"));
        // Filter the dataset to diabetes, age-adjusted prevalence only
        vis.chartData = vis.data.filter(d => 
            d.Measure.toLowerCase().includes("diabetes") && d.Data_Value_Type === "Age-adjusted prevalence"
        ); // cant use MeasureID because that variable changed meaning in 2023 data. 

        console.log("Diabetes chartData:", vis.chartData);
        // Sort by year 
        vis.chartData.sort((a,b) => a.Year - b.Year);

        // Set scale domains
        vis.xScale.domain(vis.chartData.map(d => d.Year));
       // vis.yScale.domain([0, d3.max(vis.chartData, d => d.High_Confidence_Limit) * 1.15]); // Set the scale to be a little higher than the highest confidence limit since we plan to add error bars. This will leave enough space on the scale for drawing the error bars. 
       
        const maxVal = d3.max(vis.chartData, d => d.High_Confidence_Limit);
        vis.yScale.domain([0, maxVal * 1.2]);

        vis.colorScale.domain(vis.chartData.map(d => d.Year));

        vis.renderVis();
    }


    /**
     * Attach visual elements to the data
     */
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

        // Draw the rectangular bars 
        vis.chart.selectAll(".diabetes-bar")
           .data(vis.chartData)
           .join("rect")
           .attr("class", "diabetes-bar")
           .attr("x", d => vis.xScale(d.Year))
           .attr("y", d => vis.yScale(d.Data_Value))
           .attr("width", vis.xScale.bandwidth())
           .attr("height", d => vis.height - vis.yScale(d.Data_Value))
           .attr("fill", d => vis.colorScale(d.Year))
           .on("mouseover", function(event, d) {
             vis.tooltip
                .style("opacity", 1)
                .html(`<strong>${d.Year}</strong>: ${d.Data_Value}% (CI: ${d.Low_Confidence_Limit}–${d.High_Confidence_Limit}%)`);
           })
           .on("mousemove", function(event) {
             vis.tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
           })
           .on("mouseout", function() {
             vis.tooltip.style("opacity", 0);
           });


        // Value labels directly on bars
        vis.chart.selectAll(".bar-label")
           .data(vis.chartData)
           .join("text")
           .attr("class", "bar-label")
           .attr("x", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2)
           .attr("y", d => vis.yScale(d.Data_Value) + 100)
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("font-weight", "500")
           .style("fill", "white")
           .text(d => d.Data_Value + "%");

        // Error bar - vertical line (low to high confidence limit)
        vis.chart.selectAll(".error-bar-line")
           .data(vis.chartData)
           .join("line")
           .attr("class", "error-bar-line")
           .attr("x1", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2) // creates the horizontal center of each bar (Since the error bar goes at the center of a bar).
           .attr("x2", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2)
           .attr("y1", d => vis.yScale(d.Low_Confidence_Limit))
           .attr("y2", d => vis.yScale(d.High_Confidence_Limit))
           .attr("stroke", "#2C2C2C")
           .attr("stroke-width", 1.5);

        // Error bar - top cap
        vis.chart.selectAll(".error-bar-cap-top")
           .data(vis.chartData)
           .join("line")
           .attr("class", "error-bar-cap-top")
           .attr("x1", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2 - 6)
           .attr("x2", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2 + 6)
           .attr("y1", d => vis.yScale(d.High_Confidence_Limit))
           .attr("y2", d => vis.yScale(d.High_Confidence_Limit))
           .attr("stroke", "#2C2C2C")
           .attr("stroke-width", 1.5);

        // Error bar - bottom cap
        vis.chart.selectAll(".error-bar-cap-bottom")
           .data(vis.chartData)
           .join("line")
           .attr("class", "error-bar-cap-bottom")
           .attr("x1", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2 - 6)
           .attr("x2", d => vis.xScale(d.Year) + vis.xScale.bandwidth() / 2 + 6)
           .attr("y1", d => vis.yScale(d.Low_Confidence_Limit))
           .attr("y2", d => vis.yScale(d.Low_Confidence_Limit))
           .attr("stroke", "#2C2C2C")
           .attr("stroke-width", 1.5);

        // Update axes
        vis.xAxisG.call(d3.axisBottom(vis.xScale));
        vis.yAxisG.call(d3.axisLeft(vis.yScale).tickFormat(d => d + "%"));

        // Remove axis domain lines for a cleaner look
        vis.xAxisG.select(".domain").remove();
        vis.yAxisG.select(".domain").remove();

    }


} // End of overall class