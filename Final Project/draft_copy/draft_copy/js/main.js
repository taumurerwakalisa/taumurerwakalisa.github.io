
// SVG drawing area

const width = 1100;
const height = 700;

const svg = d3.select("#chart-area")
	.append("svg")
	.attr("width", width)
	.attr("height", height)
	.attr("viewBox", [0, 0, width, height]);


// Treemap layout

const treemap = d3.treemap()
	.size([width, height])
	.paddingInner(1);


// Color scale
// Within a genre, individual blocks vary in saturation/lightness based on
// how their (selected) sales compare to the rest of the displayed games.

const GENRE_HUES = {
	"Sports":       "#d62728",  // red
	"Action":       "#1f77b4",  // blue
	"Shooter":      "#7d2828",  // dark red
	"Role-Playing": "#9467bd",  // purple
	"Platform":     "#2ca02c",  // green
	"Racing":       "#ff7f0e",  // orange
	"Fighting":     "#e377c2",  // pink
	"Simulation":   "#17becf",  // teal
	"Puzzle":       "#bcbd22",  // olive
	"Adventure":    "#8c564b",  // brown
	"Strategy":     "#393b79",  // navy
	"Misc":         "#7f7f7f"   // neutral gray
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

// Genres the user picked on the landing page (empty set = no genre filter)
const selectedGenres = new Set();


// Initialize page
buildGenreButtons();
buildLegend();
loadData();


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
		// Only render right away if the user has already navigated to the treemap
		if (d3.select("#treemap-view").style("display") !== "none") {
			updateVisualization();
		}
	});
}


// Build one button per genre on the landing page. Each button is colored
// using the genre's hue (border + text when unselected, filled when selected).
// Single click toggles the genre; double-click opens the treemap.
function buildGenreButtons() {
	const container = d3.select("#genre-buttons");
	Object.entries(GENRE_HUES).forEach(([genre, hue]) => {
		container.append("button")
			.attr("type", "button")
			.attr("class", "genre-btn")
			.style("color", hue)
			.style("border-color", hue)
			.text(genre)
			.on("click", function () { onGenreClick(genre, this); });
	});
}









// Manual single-vs-double-click discrimination so a genre isn't toggled
// on the way into a double-click.
let pendingClickTimer = null;
let pendingClickCount = 0;
const DOUBLE_CLICK_MS = 250;

function onGenreClick(genre, btnEl) {
	pendingClickCount++;
	if (pendingClickCount === 1) {
		pendingClickTimer = setTimeout(() => {
			toggleGenre(genre, btnEl);
			pendingClickCount = 0;
			pendingClickTimer = null;
		}, DOUBLE_CLICK_MS);
	} else {
		// Second click within the window — treat as a double-click
		clearTimeout(pendingClickTimer);
		pendingClickTimer = null;
		pendingClickCount = 0;
		showTreemap();
	}
}

function toggleGenre(genre, btnEl) {
	const hue = GENRE_HUES[genre];
	if (selectedGenres.has(genre)) {
		selectedGenres.delete(genre);
		d3.select(btnEl)
			.classed("selected", false)
			.style("background-color", null);
	} else {
		selectedGenres.add(genre);
		d3.select(btnEl)
			.classed("selected", true)
			.style("background-color", hue);
	}
}

function showTreemap() {
	d3.select("#genre-selector").style("display", "none");
	d3.select("#treemap-view").style("display", "block");
	updateVisualization();
}

function showGenreSelector() {
	d3.select("#treemap-view").style("display", "none");
	d3.select("#genre-selector").style("display", "block");
}

// Build the static legend below the treemap: one swatch per genre and a
// gradient bar that explains the within-genre saturation/lightness ramp.
function buildLegend() {
	const container = d3.select("#legend-genres");
	Object.entries(GENRE_HUES).forEach(([genre, hue]) => {
		const item = container.append("span").attr("class", "legend-item");
		item.append("span").attr("class", "legend-swatch").style("background-color", hue);
		item.append("span").attr("class", "legend-label").text(genre);
	});
}


// re-render on change

d3.select("#region-filter").on("change", updateVisualization);
d3.select("#year-filter").on("change", updateVisualization);
d3.select("#top-n-filter").on("change", updateVisualization);
d3.select("#back-btn").on("click", showGenreSelector);


// Update visualization

// Render id is bumped on every call so a slow label-redraw scheduled by an
// older render can detect that it's been superseded and bail out.
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

	// Apply genre filter from the landing-page selection (empty set = all genres)
	if (selectedGenres.size > 0) {
		data = data.filter(d => selectedGenres.has(d.Genre));
	}

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

	// Sales extent across the currently displayed games.
	const [minSales, maxSales] = d3.extent(data, d => d[salesField]);
	const salesRange = (maxSales - minSales) || 1;

	function gameColor(d) {
		const baseHsl = d3.hsl(GENRE_HUES[d.data.Genre]);
		const t = (d.data[salesField] - minSales) / salesRange;
		const lightEnd = d3.hsl(baseHsl.h, baseHsl.s * 0.35, 0.80);
		const darkEnd  = d3.hsl(baseHsl.h, baseHsl.s, baseHsl.l);
		return d3.interpolateHsl(lightEnd, darkEnd)(t);
	}

	// Recolor the legend's gradient bar to use the genre of the largest
	// (top-selling) game currently shown — matches the same low/high-sales
	// ramp that gameColor uses, so the bar mirrors what's on screen.
	if (data.length > 0) {
		const topGenreHsl = d3.hsl(GENRE_HUES[data[0].Genre]);
		const barLight = d3.hsl(topGenreHsl.h, topGenreHsl.s * 0.35, 0.80);
		const barDark  = d3.hsl(topGenreHsl.h, topGenreHsl.s, topGenreHsl.l);
		// "higher" sits on the left, "lower" on the right → dark → light
		d3.select(".gradient-bar")
			.style("background", `linear-gradient(to right, ${barDark}, ${barLight})`);
	}

	// Hide tooltip in case it was open from a previous block
	tooltip.style("opacity", 0);

	// Fade out and remove previous labels (they get rebuilt after the rect
	// transition; wrapping content makes per-label transitions impractical).
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
		.style("opacity", 0);

	// MERGE: rebind handlers on every render so the closure captures the
	// current `region` / `salesField` (otherwise old rects would show stale
	// region labels in the tooltip).
	const merged = rectsEnter.merge(rects)
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
				.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY + 12) + "px");
		})
		.on("mouseout", () => {
			tooltip.style("opacity", 0);
		});

	// Animate rectangles toward their new position, size, color, opacity.
	// D3 interpolates fill colors automatically.
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
		.attr("y", d => d.y0 + 14)
		.attr("font-size", "13px")
		.attr("fill", "white")
		.style("opacity", 0)
		.text(d => d.data.Name);

	labels.each(function (d) {
		const w = d.x1 - d.x0;
		const h = d.y1 - d.y0;
		// Cheap pre-filter: if the block is so small no label could possibly fit,
		// skip the wrap work and just hide.
		if (w < 28 || h < 18) {
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
// it stays inside a `blockWidth` x `blockHeight` rectangle. Hides the label
// entirely if the wrapped result still can't fit (e.g., a single long word
// wider than the block, or too many lines tall).
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

	// Vertical fit check: y is d.y0 + 14 (top inset for first baseline). The
	// last baseline sits at y + lineIndex * lineHeight, plus ~3px descender.
	const verticalFits = (14 + lineIndex * lineHeight + 3) <= blockHeight;

	// Horizontal fit check: any single tspan still wider than the block means
	// an unbreakable word — hide rather than overflow.
	let horizontalFits = true;
	text.selectAll("tspan").each(function () {
		if (this.getComputedTextLength() > availableWidth) horizontalFits = false;
	});

	if (!verticalFits || !horizontalFits) {
		text.style("display", "none");
	}
}
