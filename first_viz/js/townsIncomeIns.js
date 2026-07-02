class TownUninsByIncome {
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
           .domain(["Below $25000", "$25000 - $50000", "$50000 - $75000", "$75000 - $100000", "Above $100000"])      
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

        // Chart title 
        vis.svg.append("text")
           .attr("class", "chart-title")
           .attr("x", vis.config.margin.left + vis.width / 2)
           .attr("y", 20)
           .attr("text-anchor", "middle")
           .style("font-size", "1rem")
           .style("font-weight", "600")
           .style("fill", "#1B4F72")
           .text("Uninsurance Rates by Income Bracket, North Mecklenburg 2024");


        /**
         * Axis labels
        */

        // Y-axis label
        vis.svg.append("text")
           .attr("class", "axis-label")
           .attr("x", vis.config.margin.left + vis.width / 2)
           .attr("y", vis.config.containerHeight - 20)
           .attr("text-anchor", "middle")
           .style("font-size", "0.85rem")
           .style("fill", "#1B4F72")
           .text("Share of uninsured population (%)");

        // X-axis label
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


    updateVis(){
        let vis = this; 

        // Calculate each income brackets's share of the town's total uninsured population 

        // First, get the unique towns
        const towns = [...new Set(vis.data.map(d => d.Town))]

        vis.chartData = towns.map(town => {
            // Find the row for a town (one row per town)
            const row = vis.data.find(d => d.Town === town);

            const all_unins_income = (row.no_ins_U25 + row.no_ins_25_50 + row.no_ins_50_75 
                + row.no_ins_75_100 + row.no_ins_100_above);

            const Unins_U25k_Rate = (row.no_ins_U25 / all_unins_income) * 100; 
            const Unins_25_50k_Rate = (row.no_ins_25_50 / all_unins_income) * 100;
            const Unins_50_75k_Rate = (row.no_ins_50_75 / all_unins_income) * 100;
            const Unins_75_100k_Rate = (row.no_ins_75_100 / all_unins_income) * 100;
            const Unins_100k_above_Rate = (row.no_ins_100_above / all_unins_income) * 100;

            return {
                town: town,
                "Below $25000": Unins_U25k_Rate,
                "$25000 - $50000": Unins_25_50k_Rate,
                "$50000 - $75000": Unins_50_75k_Rate,
                "$75000 - $100000": Unins_75_100k_Rate,
                "Above $100000": Unins_100k_above_Rate
            };
        })


        // Stack the data
        vis.stack = d3.stack()
           .keys(["Below $25000", "$25000 - $50000", "$50000 - $75000", "$75000 - $100000", "Above $100000"]);

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
            .data(["Below $25000", "$25000 - $50000", "$50000 - $75000", "$75000 - $100000", "Above $100000"])
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

} // End of overall class
