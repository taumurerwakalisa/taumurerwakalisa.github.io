// SVG drawing area

const width = 2000;  /*1100;*/
const height = 1300; /*700;*/

const svg = d3.select("#chart-area")
	.append("svg")
	.attr("width", width)
	.attr("height", height)
	.attr("viewBox", [0, 0, width, height])
	// Add aria attributes to svg
	.attr("role", "region")
	.attr("aria-label", "Interactive treemap of video game sales")
	.attr("aria-describedby", "treemap-description");




// Treemap layout

const treemap = d3.treemap()
	.size([width, height])
	.paddingInner(1);


// Color scale
const GENRE_HUES = {
	"Action":       "#e31a1c",  // red
	"Adventure":    "#ff7f00",  // orange
	"Fighting":     "#b15928",  // brown
	"Misc":         "#6a3d9a",  // purple
	"Platform":     "#b2df8a",  // light green
	"Puzzle":       "#fb9a99",  // light pink
	"Racing":       "#1f78b4",  // blue
	"Role-Playing": "#cab2d6",  // light purple
	"Shooter":      "#a6cee3",  // light blue
	"Simulation":   "#fdbf6f",  // light orange
	"Sports":       "#bcbd22",  // olive
	"Strategy":     "#33a02c"   // green
};

// Year range buckets
const YEAR_RANGES = {
	"1980-1990": [1980, 1989],
	"1990-2000": [1990, 1999],
	"2000-2010": [2000, 2009],
	"2010-2020": [2010, 2020]
};

// Map from region filter value to the corresponding sales field
const REGION_FIELDS = {
	"Global": "Global_Sales",
	"NA": "NA_Sales",
	"EU": "EU_Sales",
	"JP": "JP_Sales",
	"Other": "Other_Sales"
};

// Hold the full dataset
let allData = [];

// Tooltip element for hover details
const tooltip = d3.select("#tooltip");

// Genres passed in from the hexagon selection page via URL params
// (empty set = no genre filter, show all genres)
const selectedGenres = new Set();


// Initialize page
parseSelectedGenresFromURL();
buildLegend();
loadData();


// Read the `genres` URL parameter (set on the hexagon page) 
function parseSelectedGenresFromURL() {
	const params = new URLSearchParams(window.location.search);
	const raw = params.get("genres");
	if (!raw) return;

	raw.split(",").forEach(g => {
		const name = decodeURIComponent(g).trim();
		if (!name) return;
		selectedGenres.add(normalizeGenre(name));
	});
}

function normalizeGenre(name) {
	if (name.toLowerCase() === "role-playing") return "Role-Playing";
	return name;
}


// Load CSV file
function loadData() {
	d3.csv("data/vgsales_clean.csv", d => {
		return {
			Rank: +d.Rank,
			Name: d.Name,
			Platform: d.Platform,
			Year: +d.Year,
			Genre: d.Genre,
			Publisher: d.Publisher,
			NA_Sales: +d.NA_Sales,
			EU_Sales: +d.EU_Sales,
			JP_Sales: +d.JP_Sales,
			Other_Sales: +d.Other_Sales,
			Global_Sales: +d.Global_Sales
		};
	}).then(data => {
		allData = data;
		updateVisualization();
	});
}



// Build the static legend below the treemap
function buildLegend() {
	const container = d3.select("#legend-genres");
	Object.entries(GENRE_HUES).forEach(([genre, hue]) => {
		const item = container.append("span")
			.attr("class", "legend-item")
			.attr("data-genre", genre);  // data attribute for easy selection
		
		item.append("span")
			.attr("class", "legend-swatch")
			.style("background-color", hue);
		
		item.append("span")
			.attr("class", "legend-label")
			.text(genre);
	});
}


// re-render on change

d3.select("#region-filter").on("change", updateVisualization);
d3.select("#year-filter").on("change", updateVisualization);
d3.select("#top-n-filter").on("change", updateVisualization);

// Back button returns to the hexagon genre selection page
d3.select("#back-btn").on("click", () => {
	window.location.href = "hexagons.html";
});




// Highlight selected genres in the legend
function updateLegendHighlights() {
	const allLegendItems = d3.selectAll(".legend-item");
	
	if (selectedGenres.size === 0) {
		// No filter - show all genres as active
		allLegendItems
			.classed("active", true)
			.classed("inactive", false);
	} else {
		// Filter active - highlight only selected genres
		allLegendItems.each(function() {
			const item = d3.select(this);
			const genre = item.attr("data-genre");
			const isActive = selectedGenres.has(genre);
			
			item
				.classed("active", isActive)
				.classed("inactive", !isActive);
		});
	}
}



// Update visualization

let currentRenderId = 0;
const TRANSITION_MS = 500;
const LABEL_FADE_MS = 150;
const LABEL_DELAY_MS = 350;

function updateVisualization() {
	const renderId = ++currentRenderId;

	// Read current filter values
	const region = d3.select("#region-filter").property("value");
	const yearKey = d3.select("#year-filter").property("value");
	const topN = +d3.select("#top-n-filter").property("value");

	// Pick the sales field that drives both the size and the Top-N ranking
	const salesField = REGION_FIELDS[region];

	// Start from the full dataset, drop rows with no sales in the chosen region
	let data = allData.filter(d => d[salesField] > 0);

	// Apply year filter when a specific decade is selected
	if (yearKey !== "all") {
		const [startYear, endYear] = YEAR_RANGES[yearKey];
		data = data.filter(d => d.Year >= startYear && d.Year <= endYear);
	}

	// Apply genre filter from the hexagon-page selection (empty set = all genres)
	if (selectedGenres.size > 0) {
		data = data.filter(d => selectedGenres.has(d.Genre));
	}

	// Update legend to show which genres are displayed
	updateLegendHighlights();


	// Cap the number of blocks: keep the top N by selected sales metric
	data = data
		.sort((a, b) => b[salesField] - a[salesField])
		.slice(0, topN);

	// Create hierarchy
	const root = d3.hierarchy({
		name: "Video Game Sales",
		children: data
	})
	.sum(d => d[salesField]);

	// Compute treemap positions
	treemap(root);

	// Get only the game nodes
	const games = root.leaves();


	// Color by genre 
    function gameColor(d) {
       return GENRE_HUES[d.data.Genre];
    }

	// Hide tooltip in case it was open from a previous block
	tooltip.style("opacity", 0);

	// Fade out and remove previous labels 
	svg.selectAll("text.game-label")
		.transition()
		.duration(LABEL_FADE_MS)
		.style("opacity", 0)
		.remove();

	// Bind data with a key so D3 can track which rect corresponds to which
	// game across renders. Name + Platform is unique in vgsales.
	const keyFn = d => d.data.Name + "|" + d.data.Platform;
	const rects = svg.selectAll("rect").data(games, keyFn);

	// EXIT: rectangles for games no longer in the view fade away in place.
	rects.exit()
		.transition()
		.duration(TRANSITION_MS)
		.style("opacity", 0)
		.remove();

	// ENTER: new rectangles appear at their final layout position, but start
	// invisible so the merged transition can fade them in.
	const rectsEnter = rects.enter()
		.append("rect")
		.attr("x", d => d.x0)
		.attr("y", d => d.y0)
		.attr("width", d => d.x1 - d.x0)
		.attr("height", d => d.y1 - d.y0)
		.attr("fill", gameColor)
		.attr("stroke", "white")
		.style("opacity", 0)
		.attr("tabindex", "0");  // Keyboard tabbing feature
		

	// MERGE: rebind handlers on every render so the closure captures the
	// current `region` / `salesField` (otherwise old rects would show stale
	// region labels in the tooltip).
	const merged = rectsEnter.merge(rects)

	// Update aria labels for the individual rectangles to display tooltips
    .attr("aria-label", d => {
        const salesValue = d.data[salesField].toFixed(2);
        const regionName = region === "Global" ? "Global" : 
                          region === "NA" ? "North America" :
                          region === "EU" ? "Europe" :
                          region === "JP" ? "Japan" : "Other regions";
        return `${d.data.Name}. ${d.data.Genre} game released in ${d.data.Year} on ${d.data.Platform}. Published by ${d.data.Publisher}. ${regionName} sales: ${salesValue} million.`;
    })



		.on("mouseover", (event, d) => {
			tooltip
				.style("opacity", 1)
				.html(`
					<strong>${d.data.Name}</strong><br>
					Platform: ${d.data.Platform}<br>
					Year: ${d.data.Year}<br>
					Genre: ${d.data.Genre}<br>
					Publisher: ${d.data.Publisher}<br>
					${region} Sales: ${d.data[salesField].toFixed(2)}M
				`);
		})
		.on("mousemove", (event) => {
			tooltip
				.style("left", (event.clientX + 30) + "px")
				.style("top", (event.clientY - 100) + "px");
		})
		.on("mouseout", () => {
			tooltip.style("opacity", 0);
		})

	// Add keyboard focus events
    .on("focus", function(event, d) {
        // Highlight the focused rectangle
        d3.select(this)
            .attr("stroke-width", 3)
            .attr("stroke", "black");  // Black border
        
        // Show tooltip at a fixed position (centered at top)
        tooltip
            .style("opacity", 1)
            .html(`
                <strong>${d.data.Name}</strong><br>
                Platform: ${d.data.Platform}<br>
                Year: ${d.data.Year}<br>
                Genre: ${d.data.Genre}<br>
                Publisher: ${d.data.Publisher}<br>
                ${region} Sales: ${d.data[salesField].toFixed(2)}M
            `)
            .style("left", "50%")
            .style("top", "100px")
            .style("transform", "translateX(-50%)");
    })
    .on("blur", function() {
        // Remove highlight
        d3.select(this)
            .attr("stroke-width", 1)
            .attr("stroke", "white");
        
        // Hide tooltip
        tooltip.style("opacity", 0);
    });






// Animate rectangles toward their new position, size, color, opacity.
	merged.transition()
		.duration(TRANSITION_MS)
		.attr("x", d => d.x0)
		.attr("y", d => d.y0)
		.attr("width", d => d.x1 - d.x0)
		.attr("height", d => d.y1 - d.y0)
		.attr("fill", gameColor)
		.style("opacity", 1);

	// Once the rectangles are mostly settled, draw the wrapped labels and
	// fade them in. Bail if a newer render started in the meantime.
	setTimeout(() => {
		if (renderId !== currentRenderId) return;
		drawLabels(games);
	}, LABEL_DELAY_MS);
}




// Append wrapped labels for the given set of leaves and fade them in.
function drawLabels(games) {
	const labels = svg.selectAll("text.game-label")
		.data(games, d => d.data.Name + "|" + d.data.Platform)
		.enter()
		.append("text")
		.attr("class", "game-label")
		.attr("x", d => d.x0 + 4)
		.attr("y", d => d.y0 + 30)
		.attr("font-size", d => {
	const rectWidth = d.x1 - d.x0;
	const rectHeight = d.y1 - d.y0;
	const area = rectWidth * rectHeight;
	
	// Scale based on area: small rects = 10px, very large = 28px
	const fontSize = Math.max(10, Math.min(28, Math.sqrt(area) / 15));
	return fontSize + "px";
})
		.attr("fill", "white")
		.style("opacity", 0)
		.text(d => d.data.Name);

	labels.each(function (d) {
		const w = d.x1 - d.x0;
		const h = d.y1 - d.y0;
		
		// Increased minimum size threshold
		if (w < 40 || h < 25) {
			d3.select(this).style("display", "none");
			return;
		}
		wrapLabel(this, w, h);
	});

	labels.transition()
		.duration(200)
		.style("opacity", 1);
}


// Wrap the text content of an SVG <text> node into multiple <tspan> lines so
// it stays inside a `blockWidth` x `blockHeight` rectangle.
function wrapLabel(textNode, blockWidth, blockHeight) {
	const text = d3.select(textNode);
	const words = text.text().split(/\s+/);
	const x = +text.attr("x");
	const y = +text.attr("y");
	const fontSize = parseFloat(text.attr("font-size")) || 13;
	const lineHeight = fontSize * 1.15;
	const horizontalPadding = 8;            // 4px on each side
	const availableWidth = blockWidth - horizontalPadding;

	// Reset and rebuild as tspans, one per wrapped line
	text.text(null);
	let tspan = text.append("tspan").attr("x", x).attr("y", y);
	let line = [];
	let lineIndex = 0;

	for (const word of words) {
		line.push(word);
		tspan.text(line.join(" "));
		if (tspan.node().getComputedTextLength() > availableWidth && line.length > 1) {
			// The newest word pushed the line past the edge — back it out and
			// start a new tspan with that word on the next line.
			line.pop();
			tspan.text(line.join(" "));
			lineIndex++;
			line = [word];
			tspan = text.append("tspan")
				.attr("x", x)
				.attr("y", y + lineIndex * lineHeight)
				.text(word);
		}
	}

	// Vertical fit check
	const verticalFits = (14 + lineIndex * lineHeight + 3) <= blockHeight;

	// Horizontal fit check
	let horizontalFits = true;
	text.selectAll("tspan").each(function () {
		if (this.getComputedTextLength() > availableWidth) horizontalFits = false;
	});

	if (!verticalFits || !horizontalFits) {
		text.style("display", "none");
	}
}
