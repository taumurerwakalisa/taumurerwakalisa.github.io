// Global objects go here (outside of any functions)

let data, scatterplot, barchart; 
let difficultyFilter = [];
const dispatcher = d3.dispatch('filterCategories');

/**
 * Load data from CSV file asynchronously and render charts
 */

d3.csv('data/vancouver_trails.csv')
   .then(_data => {
     data = _data; // for safety, so that we use a local copy of data.

     // ... data preprocessing etc. ... TODO: you add code here for numeric
     // Be sure to examine your data to fully understand the code

     //Use for each to change the numerical values to numeric ...
     data.forEach(
        d => {
            d.distance = +d.distance;
            d.time = +d.time
        } 
     )
     // Initialize scale
     const colorScale = d3.scaleOrdinal()
            .domain(['Easy', 'Intermediate', 'Difficult'])
            .range(['#D1F9BD', '#53D312','#2A6C09']);
           
            // TODO: add an ordinal scale for the difficulty
     // See Lab 4 for help


     
     scatterplot = new Scatterplot({
      parentElement: '#scatterplot',
        colorScale: colorScale}, data); //we will update config soon
     scatterplot.updateVis();


 
     barchart = new Barchart({parentElement: '#barchart', colorScale: colorScale, dispatcher: dispatcher}, data);
       barchart.updateVis(); 

     dispatcher.on('filterCategories', selectedCategories => {
	    if (selectedCategories.length == 0) {
		    scatterplot.data = data;
	    } 
       else {
		    scatterplot.data = data.filter(d => selectedCategories.includes(d.difficulty));
	    }
	  scatterplot.updateVis();
     })
   })
  .catch(error => console.error(error)); 


/**
 * Use bar chart as filter and update scatter plot accordingly
 */
/*COMMENT OUT THE FILTER DATA TO REPLACE IT WITH THE DISPATCHER:
function filterData() {
 	if (difficultyFilter.length == 0) {
   		scatterplot.data = data;
  	} else {
    		scatterplot.data = data.filter(d =>
difficultyFilter.includes(d.difficulty));
  	}
  	scatterplot.updateVis();
}*/









