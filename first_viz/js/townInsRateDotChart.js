class TownInsRate {

    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 750,
            containerHeight: _config.containerHeight || 350,
            margin: _config.margin || {top: 80, right: 20, bottom: 40, left: 20},
            dispatcher: _config.dispatcher
        }

        this.data = _data;
        this.initVis(); 
    }

    /**
     * Setting up svg area and drawing grids of dots for the waffle/dot chat
     */

    initVis(){
        let vis = this; 

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement)
           .append("svg")
           .attr("width", vis.config.containerWidth)
           .attr("height", vis.config.containerHeight);

        vis.chart = vis.svg.append("g")
           .attr("transform", `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

        // Color scale
        vis.colorScale = d3.scaleOrdinal()
           .domain(["Insured", "Uninsured"])
           .range(["#2E86AB", "#E8A838"]);
        
        // Grid settings - 10x10 grid of dots per town
        vis.gridCols = 10; // Defines how many dots there are per row: 10 dots per column 
        vis.gridRows = 10; // Defines how many rows there are in total. 
        vis.dotRadius = 9;
        vis.dotSpacing = 21;
        vis.townGridWidth = vis.gridCols * vis.dotSpacing;
        
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
           .text("Overall Insurance Coverage Rates, North Mecklenburg 2024");

        vis.updateVis();
        
    }



    updateVis(){
        let vis = this; 

        vis.chartData = vis.data.map(d => {
            let insuredPct = (d.all_ins / (d.all_ins + d.all_unins)) * 100;
            let uninsuredCount = Math.round((d.all_unins / (d.all_ins + d.all_unins)) * 100);

            return{
                town: d.Town,
                insuredPct: insuredPct,
                uninsuredCount: uninsuredCount
            };
        });

        vis.renderVis();

    }


    /**
     * Attach data to visual elements
     */

    renderVis(){
        let vis = this; 

        const townSpacing = vis.width / vis.chartData.length;

        // Create a group for each town
        const townGroups = vis.chart.selectAll(".town-group")
            .data(vis.chartData)
            .join("g")
            .attr("class", "town-group")
            .attr("transform", (d, i) => `translate(${i * townSpacing + (townSpacing - vis.townGridWidth) / 2}, 0)`);
        
        // Town label
        townGroups.selectAll(".town-title")
            .data(d => [d])
            .join("text")
            .attr("class", "town-title")
            .attr("x", vis.townGridWidth / 2)
            .attr("y", -27)
            .attr("text-anchor", "middle")
            .style("font-size", "1.2rem")
            .style("font-weight", "500")
            .style("fill", "#1B4F72")
            .text(d => d.town);

        // Town subtitles (stats)
        townGroups.selectAll(".town-subtitle")
            .data(d => [d])
            .join("text")
            .attr("class", "text-anchor")
            .attr("x", vis.townGridWidth / 2)
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .style("font-size", "0.85rem")
            .style("fill", "#5F6B7A")
            .text(d => `${d.uninsuredCount} of 100 uninsured`);

        // Draw the 100 dots for each town 
        townGroups.each(function(townData) {
            const dotsData = d3.range(100).map(i => ({
                isUninsured: i >= (100 - townData.uninsuredCount)
            }));
        

        d3.select(this).selectAll(".dot")
          .data(dotsData)
          .join("circle")
          .attr("class", "dot")
          .attr("cx", (d, i) => (i % vis.gridCols) * vis.dotSpacing + vis.dotRadius)
          .attr("cy", (d, i) => Math.floor(i / vis.gridCols) * vis.dotSpacing + vis.dotRadius)
          .attr("r", vis.dotRadius)
          .attr("fill", d => d.isUninsured ? "#E8A838" : "#2E86AB")
          .on("mouseover", function(event, d) {
            vis.tooltip
               .style("opacity", 1)
               .html(`<strong>${townData.town}</strong>: ${d.isUninsured ? "Uninsured" : "Insured"}`);
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

        // Legend
        const legend = vis.svg.selectAll(".legend")
          .data(["Insured", "Uninsured"])
          .join("g")
          .attr("class", "legend")
          .attr("transform", (d, i) => `translate(${vis.config.margin.left + vis.width / 2 - 100 + i * 100}, ${vis.config.containerHeight - 15})`);

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


} // End of class