class DepressionDumbbell {
    
    constructor(_config, _data){
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 600,
            containerHeight: _config.containerHeight || 350,
            margin: _config.margin || {top: 40, right: 60, bottom: 50, left: 100},
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

        // Color scale - one color for "start year", one for "end year"
        vis.colorScale = d3.scaleOrdinal()
           .domain(["2019", "2023"])
           .range(["#90C7E3", "#1B4F72"]);
    
        // X scale - depression rate (percentage)
        vis.xScale = d3.scaleLinear()
           .range([0, vis.width]);

        // Y scale - towns (categorical)
        vis.yScale = d3.scaleBand()
           .range([0, vis.height])
           .padding(0.5);
        
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

        // Axis labels
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", vis.config.margin.left + vis.width / 2)
           .attr("y", vis.config.containerHeight - 10)
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Depression Prevalence (%)");
        
        vis.updateVis(); 
    
    }



    updateVis() { 
        let vis = this; 

        // Get unique towns data --> Since we have duplicates of towns in our dataset. One town has multiple rows associated with it since there are multiple measures  
        const towns = [...new Set(vis.data.map(d => d.Town))]; 

        vis.chartData = towns.map(town => {
            const rows2019 = vis.data.filter(d =>
                d.Town == town &&
                d.Measure.toLowerCase().includes("depression") &&
                d.Data_Value_Type === "Age-adjusted prevalence" &&
                d.Year === 2019
            );


            const rows2023 = vis.data.filter(d => 
                d.Town === town &&
                d.Measure.toLowerCase().includes("depression") &&
                d.Data_Value_Type === "Age-adjusted prevalence" &&
                d.Year === 2023
            );

            return {
                town: town,
                value2019: rows2019.length > 0 ? rows2019[0].Data_Value : null,
                value2023: rows2023.length > 0 ? rows2023[0].Data_Value: null
            };
        });

        // Set scale domains
        const allValues = vis.chartData.flatMap(d => [d.value2019, d.value2023]).filter(v => v !== null); 
        vis.xScale.domain([0, d3.max(allValues) * 1.15]);
        vis.yScale.domain(vis.chartData.map(d => d.town)); 

        vis.renderVis(); 
    }



    renderVis() {
        let vis = this; 

        // Draw the connecting line for each town --> Connects two points
        vis.chart.selectAll(".dumbbell-line")
           .data(vis.chartData)
           .join("line")
           .attr("class", "dumbbell-line")
           .attr("x1", d => vis.xScale(d.value2019))
           .attr("x2", d => vis.xScale(d.value2023))
           .attr("y1", d => vis.yScale(d.town) + vis.yScale.bandwidth() / 2)
           .attr("y2", d => vis.yScale(d.town) + vis.yScale.bandwidth() / 2)
           .attr("stroke", "#90C7E3")
           .attr("stroke-width", 3);

        // Draw the 2019 dot
        vis.chart.selectAll(".dot-2019")
           .data(vis.chartData)
           .join("circle")
           .attr("class", "dot-2019")
           .attr("cx", d => vis.xScale(d.value2019))
           .attr("cy", d => vis.yScale(d.town) + vis.yScale.bandwidth() /2)
           .attr("r", 7)
           .attr("fill", vis.colorScale("2019"))
           .on("mouseover", function(event, d) {
             vis.tooltip 
                .style("opacity", 1)
                .html(`<strong>${d.town}</strong> (2019): ${d.value2019}%`);
           })
           .on("mousemove", function(event) {
             vis.tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
           })
           .on("mouseout", function() {
             vis.tooltip.style("opacity", 0);
           });
        
        // Draw the 2023 dot
        vis.chart.selectAll(".dot-2023")
           .data(vis.chartData)
           .join("circle")
           .attr("class", "dot-2023")
           .attr("cx", d => vis.xScale(d.value2023))
           .attr("cy", d => vis.yScale(d.town) + vis.yScale.bandwidth() / 2)
           .attr("r", 7)
           .attr("fill", vis.colorScale("2023"))
           .on("mouseover", function(event, d) {
             vis.tooltip 
                .style("opacity", 1)
                .html(`<strong>${d.town}</strong> (2023): ${d.value2023}%`);
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
        vis.xAxisG.call(d3.axisBottom(vis.xScale).tickFormat(d => d + "%"));
        vis.yAxisG.call(d3.axisLeft(vis.yScale));

        // Legend
        const legend = vis.svg.selectAll(".legend")
           .data(["2019", "2023"])
           .join("g") //create a group element for each legend item i.e. one for 2019 and one for 2023. 
           .attr("class", "legend")
           .attr("transform", (d, i) => `translate(${vis.config.margin.left + i * 80}, ${vis.config.containerHeight - 5})`);

        legend.append("circle")
           .attr("r", 6)
           .attr("cy", -4)
           .attr("fill", d => vis.colorScale(d)); 

        legend.append("text")
           .attr("x", 12)
           .attr("y", 0)
           .style("fill", "#1B4F72")
           .style("font-size", "0.8rem")
           .text(d => d);

    }

} // End of overall class
