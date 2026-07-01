/**
 * This first class is for creating the first bar chart for Health insurance coverage
 * costs vs. employment status. 
 */
class InsuranceChart {
    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    
    constructor(_config, _data) {
      // Configuration object with defaults
      this.config = {
        parentElement: _config.parentElement,
        //colorScale: _config.colorScale, --> Because doing this will inherit the colorScale from main.js
        containerWidth: _config.containerWidth || 420,
        containerHeight: _config.containerHeight || 300,
        margin: _config.margin || {top: 40, right: 20, bottom: 80, left: 55},
        dispatcher: _config.dispatcher
      }
      this.data = _data;
      this.initVis();
    }


    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */

    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Create SVG - Define size of svg drawing area 
        vis.svg = d3.select(vis.config.parentElement)
           .append("svg")
           .attr("width", vis.config.containerWidth)
           .attr("height", vis.config.containerHeight);

        // SVG Chart group containing the actual chart; using D3 margin convention
        vis.chart = vis.svg.append('g')
           .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
        
        // Color scale: 
        vis.colorScale = d3.scaleOrdinal()
           .domain(["Insured", "Uninsured"])
           .range(["#2E86AB", "#E8A838"])
        
        
        /**
         * Initialize scales 
         */

  
        // X scale
        vis.xScale = d3.scaleBand() // scaleBand for categorical data (to create a band for each category).
           .range([0, vis.width])
           .padding(0.5); // Controls the gap between the bands (and eventually the bars).

        // Y scale
        vis.yScale = d3.scaleLinear() // scaleLinear for continuous data.
           .range([vis.height, 0]);

        /**
         * Append axis groups
         */

        // Gridlines group - drawn BEFORE axes so bars sit on top
        vis.gridG = vis.chart.append("g")
           .attr("class", "grid");
        
        // Append X axis group
        vis.xAxisG = vis.chart.append("g") // Container within which the axis is drawn. 
           .attr("class", "axis x-axis")
           .attr("transform", `translate(0, ${vis.height})`);

        // Append Y axis group
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
           .text("Insurance Coverage by Employment Status, 2024");

        /**
         * Axis labels
         */
        
        // X axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", vis.config.margin.left + vis.width/2)
           .attr("y", vis.config.containerHeight - 35)
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Employment status")
        
        // Y axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", -(vis.config.margin.top + vis.height / 2))
           .attr("y", 10)
           .attr("transform", "rotate(-90)")
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Insurance coverage rate (%)");

        vis.updateVis();
    }


    /**
     * Prepare data and scales before we render it
     */

    updateVis() {
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

        // Calculate the insurance rates by employement status
        // vis.chartData is an array of objects

        vis.chartData = [
            {
                category: "Employed",
                Insured: (vis.data[0].emp_insured / (vis.data[0].emp_insured + vis.data[0].emp_uninsured)) * 100,
                Uninsured: (vis.data[0].emp_uninsured / (vis.data[0].emp_insured + vis.data[0].emp_uninsured)) * 100
            },
            
            {
                category: "Unemployed",
                Insured: (vis.data[0].unemp_insured / (vis.data[0].unemp_insured + vis.data[0].unemp_uninsured)) * 100,
                Uninsured: (vis.data[0].unemp_uninsured / (vis.data[0].unemp_insured + vis.data[0].unemp_uninsured)) * 100
            }
        ];


        // Set scale domains
        vis.xScale.domain(vis.chartData.map(d => d.category)); // Creates bands based on the two categories (employed and unemployed)
        vis.yScale.domain([0,100]);

        // Stack the data
        vis.stack = d3.stack()
           .keys(["Insured", "Uninsured"]);

        vis.stackedData = vis.stack(vis.chartData); // store the stacked data in one place. 

        vis.renderVis();
    }


    /**
     * Bind data to visual elements
     */

    renderVis(){
        let vis = this;
        // Draw the stacked bars
        
        vis.chart.selectAll("g.layer")  //!! COME BACK TO THIS SECTION LATER - EXPL
           .data(vis.stackedData)
           .join("g")
           .attr("class", "layer")
           .attr("fill", d => vis.colorScale(d.key))
           .selectAll("rect")
           .data(d => d)
           .join("rect")
           .attr("x", d => vis.xScale(d.data.category))
           .attr("y", d => vis.yScale(d[1]))
           .attr("height", d => vis.yScale(d[0]) - vis.yScale(d[1]))
           .attr("width", vis.xScale.bandwidth())

        
        // Tooltip mouse events
        .on("mouseover", function(event, d) {
            let value = (d[1] - d[0]).toFixed(1);
            let label = d3.select(this.parentNode).datum().key;
            vis.tooltip
               .style("opacity", 1)
               .html(`<strong>${label}</strong>: ${value}%`);
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
        vis.xAxisG.call(d3.axisBottom(vis.xScale));
        vis.yAxisG.call(d3.axisLeft(vis.yScale).tickFormat(d => d + "%"));       


        // Legend
        const legend = vis.svg.selectAll(".legend")
           .data(["Insured", "Uninsured"])
           .join("g")
           .attr("class", "legend")
           .attr("transform", (d, i) => `translate(${vis.config.margin.left + i *100}, ${vis.config.containerHeight - 15})`);
                
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

    











