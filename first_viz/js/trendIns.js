class TrendInsChart {
    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */

    constructor(_config, _data) {
        // Configuration object with defaults
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 680,
        containerHeight: _config.containerHeight || 400,
        margin: _config.margin || {top: 40, right: 30, bottom: 70, left: 120},
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

        // Calculate inner chart size
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Create SVG - Define size of svg drawing area
        vis.svg = d3.select(vis.config.parentElement)
           .append("svg")
           .attr("width", vis.config.containerWidth)
           .attr("height", vis.config.containerHeight)

        // SVG Chart group containing the actual chart; using D3 margin convention
        vis.chart = vis.svg.append('g')
           .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
        
        // Color scale: 
        vis.colorScale = d3.scaleOrdinal()
           .domain(["Insured", "Uninsured"])
           .range(["#2E86AB", "#E8A838"]);
        
        /**
         * Initialize scales 
         */

        // X scale - Years
        vis.xScale = d3.scalePoint()
           .range([0, vis.width]) // specifies where on the screen the x-axis values should appear i.e. from left to right of the chart
           .padding(0.5);
        
        // Y scale - Insurance rate
        vis.yScale = d3.scaleLinear()
           .range([vis.height, 0]);
        

        /**
         * Append axis groups  
         */

        // Append x-axis group
        vis.xAxisG = vis.chart.append("g")
           .attr("class", "axis x-axis")
           .attr("transform", `translate(0, ${vis.height})`);
        
        // Append y-axis group 
        vis.yAxisG = vis.chart.append("g")
           .attr("class", "axis y-axis")
        

        // Chart Title
        vis.svg.append("text")
           .attr("class", "chart-title")
           .attr("x", vis.config.margin.left + vis.width / 2)
           .attr("y", 20)
           .attr("text-anchor", "middle")
           .style("font-size", "1rem")
           .style("font-weight", "600")
           .style("fill", "#1B4F72")
           .text("Trend in Insurance Coverage Rates");

        /**
         * Axis Labels 
         */

        // X axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", vis.config.margin.left + vis.width/2)
           .attr("y", vis.config.containerHeight - 20)
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Year")
        
        // Y axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", -(vis.config.margin.top + vis.height / 2))
           .attr("y", 30)
           .attr("transform", "rotate(-90)")
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Insurance Coverage Rate (%)");
        
           
        vis.updateVis();

    }


    /**
     * Prepare data and set scale domains before we render the chart
     */

    updateVis(){
        let vis = this; 

        /*
        // Placeholder data until I pull the actual file 
        vis.chartData = [
            {year: 2009, Insured: 82, Uninsured: 18},
            {year: 2013, Insured: 85, Uninsured: 15},
            {year: 2019, Insured: 90, Uninsured: 10},
            {year: 2024, Insured: 93, Uninsured: 7}
        ]
            */

        // Use all the years 
        vis.chartData = vis.data.map(d => ({
         year: d.year,
         Insured: (d.all_ins / (d.all_ins+d.all_unins)) * 100,
         Uninsured: (d.all_unins / (d.all_ins+d.all_unins)) * 100
        }));

        // Sort by year just in case
        vis.chartData.sort((a,b) => a.year - b.year);

        // Set scale domains
        vis.xScale.domain(vis.chartData.map(d => d.year));
        vis.yScale.domain([0,100]);

        vis.renderVis();
        
    }


    /**
     * Bind data to visual elements
     */

    renderVis(){
        let vis = this; 

        // Create/Initialize line for insured
        const insuredLine = d3.line()
           .x(d => vis.xScale(d.year))
           .y(d => vis.yScale(d.Insured));

        // Create line for uninsured
        const uninsuredLine = d3.line()
           .x(d => vis.xScale(d.year))
           .y(d => vis.yScale(d.Uninsured));

        // Draw insured line
        vis.chart.selectAll(".line-insured")
           .data([vis.chartData])
           .join("path")
           .attr("class", "line-insured")
           .attr("fill", "none")
           .attr("stroke", "#2E86AB")
           .attr("stroke-width", 2.5)
           .attr("d", insuredLine);  // "d" attribute is the path element - it sets the drawing instructions. Since we already generated a line, we'll reference that for the path instructions. 
        
        
        // Draw uninsured line
        vis.chart.selectAll(".line-uninsured")
           .data([vis.chartData])
           .join("path")
           .attr("class", "line-uninsured")
           .attr("fill", "none")
           .attr("stroke", "#E8A838")
           .attr("stroke-width", 2.5)
           .attr("d", uninsuredLine);

        // Draw individual dots/points for the insured line
        vis.chart.selectAll(".dot-insured")
           .data(vis.chartData)
           .join("circle")
           .attr("class", "dot-insured")
           .attr("cx", d => vis.xScale(d.year))
           .attr("cy", d => vis.yScale(d.Insured))
           .attr("r", 5)
           .attr("fill", "#2E86AB")

        // Draw individual dots/points for the uninsured line
        vis.chart.selectAll(".dot-uninsured")
           .data(vis.chartData)
           .join("circle")
           .attr("class", "dot-uninsured")
           .attr("cx", d => vis.xScale(d.year))
           .attr("cy", d => vis.yScale(d.Uninsured))
           .attr("r", 5)
           .attr("fill", "#E8A838")
        
        // Update axes
        vis.xAxisG.call(d3.axisBottom(vis.xScale));
        vis.yAxisG.call(d3.axisLeft(vis.yScale).tickFormat(d => d + "%"));


        // Legend
        const legend = vis.svg.selectAll(".legend")
           .data(["Insured", "Uninsured"])
           .join("g")
           .attr("class", "legend")
           .attr("transform", (d, i) => `translate(${vis.config.margin.left + i *100}, ${vis.config.containerHeight - 10})`);
                
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


} // End of class