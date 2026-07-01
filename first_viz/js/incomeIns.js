class IncInsChart {
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
        containerWidth: _config.containerWidth || 550,
        containerHeight: _config.containerHeight || 420,
        margin: _config.margin || {top: 40, right: 30, bottom: 80, left: 100},
        dispatcher: _config.dispatcher
      }
      this.data = _data;
      this.initVis();
    }



    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */

    initVis(){
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
           .range(["#2E86AB", "#E8A838"]);

        /**
         * Initialize scales
         */

        // X scale - Insurance Rates 
        vis.xScale = d3.scaleLinear()
           .range([0, vis.width]);
        
        // Y scale - Income brackets
        vis.yScale = d3.scaleBand()
           .range([0, vis.height])
           .padding(0.4); // controls the gap between the bars (to make them thin or larger)
        

        
        /**
         * Append axis groups
         */
    
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
           .text("Insurance Coverage Rates By Income Bracket, 2024");

        /**
         * Axis labels
         */
        
        // X axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", vis.config.margin.left + vis.width/2)
           .attr("y", vis.config.containerHeight - 30)
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Insurance coverage rate (%)")
        
        // Y axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", -(vis.config.margin.top + vis.height / 2))
           .attr("y", 20)
           .attr("transform", "rotate(-90)")
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Income bracket");


        vis.updateVis();

    }


    /**
     * Prepare data and set scale domains before we render the chart
     */

    updateVis(){
        let vis = this;

        // Calculate the insurance rates by income status 
        vis.chartData = [
            {
                category: "Under $25k",
                Insured: (vis.data[0].ins_U25 / (vis.data[0].ins_U25 + vis.data[0].no_ins_U25)) * 100,
                Uninsured: (vis.data[0].no_ins_U25 / (vis.data[0].ins_U25 + vis.data[0].no_ins_U25)) * 100
            },

            {
                category: "$25k - $50k",
                Insured: (vis.data[0].ins_25_50 / (vis.data[0].ins_25_50 + vis.data[0].no_ins_25_50)) * 100,
                Uninsured: (vis.data[0].no_ins_25_50 / (vis.data[0].ins_25_50 + vis.data[0].no_ins_25_50)) * 100
            },

            {
                category: "$50k - $75k",
                Insured: (vis.data[0].ins_50_75 / (vis.data[0].ins_50_75 + vis.data[0].no_ins_50_75)) * 100,
                Uninsured: (vis.data[0].no_ins_50_75 / (vis.data[0].ins_50_75 + vis.data[0].no_ins_50_75)) * 100
            },

            {
                category: "$75k - $100k",
                Insured: (vis.data[0].ins_75_100 / (vis.data[0].ins_75_100 + vis.data[0].no_ins_75_100)) * 100,
                Uninsured: (vis.data[0].no_ins_75_100 / (vis.data[0].ins_75_100 + vis.data[0].no_ins_75_100)) * 100
            },

            {
                category: "Above $100k",
                Insured: (vis.data[0].ins_100_above / (vis.data[0].ins_100_above + vis.data[0].no_ins_100_above)) * 100,
                Uninsured: (vis.data[0].no_ins_100_above / (vis.data[0].ins_100_above + vis.data[0].no_ins_100_above)) * 100
            }
        ]

        // Stack the data
        vis.stack = d3.stack()
           .keys(["Insured", "Uninsured"])

        vis.stackedData = vis.stack(vis.chartData);


        // Set scale domains 
        vis.xScale.domain([0,100]);
        vis.yScale.domain(vis.chartData.map(d => d.category));
        
       
        vis.renderVis();
        
    }


    /**
     * Bind data to visual elements
     */

    renderVis(){
        let vis = this;

        // Drawing the bars:


         vis.chart.selectAll("g.layer")  //!! COME BACK TO THIS SECTION LATER - EXPL
           .data(vis.stackedData)
           .join("g")
           .attr("class", "layer")
           .attr("fill", d => vis.colorScale(d.key))
           .selectAll("rect")
           .data(d => d)
           .join("rect")
           .attr("x", d => vis.xScale(d[0]))
           .attr("y", d => vis.yScale(d.data.category))
           .attr("width", d => vis.xScale(d[1]) - vis.xScale(d[0]))
           .attr("height", vis.yScale.bandwidth())


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
               vis.xAxisG.call(d3.axisBottom(vis.xScale)
                  .tickValues([0, 25, 50, 75, 100])
                  .tickFormat(d => d + "%"));
               vis.yAxisG.call(d3.axisLeft(vis.yScale)); 


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

} // End of the class