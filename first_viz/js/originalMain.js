let data;
let placesData; 


d3.csv('data/nmeck_all_health.csv')
   .then(_data => {
    data = _data; // for safety, so that we use a local copy of data.
    console.log(data);

    data.forEach(
        d => {
            d.year = +d.year;
            d.tot_lf = +d.tot_lf;
            d.emp_insured = +d.emp_insured;
            d.emp_uninsured = +d.emp_uninsured;
            d.unemp_insured = +d.unemp_insured;
            d.unemp_uninsured = +d.unemp_uninsured;
            d.ins_U25 = +d.ins_U25;
            d.no_ins_U25 = +d.no_ins_U25;
            d.ins_25_50 = +d.ins_25_50;
            d.no_ins_25_50 = +d.no_ins_25_50;
            d.ins_50_75 = +d.ins_50_75;
            d.no_ins_50_75 = +d.no_ins_50_75;
            d.ins_75_100 = +d.ins_75_100;
            d.no_ins_75_100 = +d.no_ins_75_100;
            d.ins_100_above = +d.ins_100_above;
            d.no_ins_100_above = +d.no_ins_100_above;
            d.ins_U18 = +d.ins_U18;
            d.unins_U18 = +d.unins_U18;
            d.ins_19_25 = +d.ins_19_25;
            d.unins_19_25 = +d.unins_19_25;
            d.ins_26_34 = +d.ins_26_34;
            d.unins_26_34 = +d.unins_26_34;
            d.ins_35_64 = +d.ins_35_64;
            d.unins_35_64 = +d.unins_35_64;
            d.ins_65_over = +d.ins_65_over;
            d.unins_65_over = +d.unins_65_over;
            d.all_ins = +d.all_ins;
            d.all_unins = +d.all_unins;
            d.emp_based_ins = +d.emp_based_ins;
            d.dir_purchase_ins = +d.dir_purchase_ins;
            d.medicare_cov = +d.medicare_cov;
            d.medicaid_cov = +d.medicaid_cov;
            d.tricare_cov = +d.tricare_cov;
            d.VA_cov = +d.VA_cov;
            d.other_cov_type = +d.other_cov_type;
            d.Tot_pop = +d.Tot_pop;

        });

    // Default state
    let activeTown = "All";
    let activeYear = 2024;


    
    /**
     * Initial chart renders
     */

    //Insurance and Employment stacked bar chart
    let empInsData = data.filter(d => d.Town == activeTown && d.year == activeYear);
    let insuranceChart = new InsuranceChart({parentElement: '#empInsViz-container'}, empInsData);

    //Insurance and Income side by side bar chart
    let incInsData = data.filter(d => d.Town == activeTown && d.year == activeYear);
    let incomeInsChart = new IncInsChart({parentElement: '#incInsViz-container'}, incInsData);
    console.log(incomeInsChart);

    //Insurance and Age horizontal stacked bar chart
    let ageInsData = data.filter(d => d.Town == activeTown && d.year == activeYear);
    let ageInsChart = new AgeInsChart({parentElement: '#ageInsViz-container'}, ageInsData);

    //Insurance Type (Town comparison)
    let heatmapData = data.filter(d => d.year == activeYear);
    let townHeatmap = new TownHeatmap({parentElement: '#townInsHeatmapViz-container'}, heatmapData);
    let insCoverageTypeBar;

    //Insurance Trend line chart
    let trendInsData = data.filter(d => d.Town == activeTown);
    let trendInsChart = new TrendInsChart({parentElement: '#trendInsViz-container'}, trendInsData);

    //Insurance Coverage Rate Data - Related to the dot chart visualization
    let townInsRateData = data.filter(d => d.year == activeYear);
    let townInsRate = new TownInsRate({parentElement: "#townInsRateViz-container"}, townInsRateData);

    //Diabetes Health Outcomes chart
    let diabetesData = placesData ? placesData.filter(d => d.Town === activeTown) : [];
    let diabetesChart = new DiabetesChart({parentElement: '#diabetesViz-container'}, diabetesData);

    //Mental Health distress chart
    let mentalHealthDistressData = placesData ? placesData.filter(d => d.Town === activeTown) : [];
    let mentalHealthDistressChart = new MentalHealthDistressChart({parentElement: '#mentalHealthDistressViz-container'}, mentalHealthDistressData);
    
    //Uninsurance By age charts - declaring the variables
    let ageUninsTrendChart;
    let townUninsByAgeChart; 
    
    // Town button clicks
    document.querySelectorAll(".town-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".town-btn").forEach( b => b.classList.remove("active"));
            this.classList.add("active");
            activeTown = this.dataset.town.charAt(0).toUpperCase() + this.dataset.town.slice(1); // calling the current town that was picked by the user then we'll update it to active.
           

            if (activeTown !== "All"){
                empInsData = data.filter(d => d.Town == activeTown && d.year == activeYear);
                d3.select("#empInsViz-container").html(""); // clear the svg area (i.e. remove the existing chart) to make room for the new chart going to be rendered
                insuranceChart = new InsuranceChart({parentElement: '#empInsViz-container'}, empInsData);
                //console.log("new chart:", insuranceChart);

                incInsData = data.filter(d => d.Town == activeTown && d.year == activeYear);
                d3.select("#incInsViz-container").html("");
                incomeInsChart = new IncInsChart({parentElement: "#incInsViz-container"}, incInsData);

                ageInsData = data.filter(d => d.Town == activeTown && d.year == activeYear);
                d3.select("#ageInsViz-container").html("");
                ageInsChart = new AgeInsChart({parentElement: '#ageInsViz-container'}, ageInsData);

                trendInsData = data.filter(d => d.Town == activeTown);
                d3.select("#trendInsViz-container").html("");
                trendInsChart = new TrendInsChart({parentElement: "#trendInsViz-container"}, trendInsData);

                diabetesData = placesData ? placesData.filter(d => d.Town === activeTown) : [];
                d3.select("#diabetesViz-container").html("");
                diabetesChart = new DiabetesChart({parentElement: '#diabetesViz-container'}, diabetesData);

                mentalHealthDistressData = placesData ? placesData.filter(d => d.Town === activeTown) : [];
                d3.select("#mentalHealthDistressViz-container").html("");
                mentalHealthDistressChart = new MentalHealthDistressChart({parentElement: '#mentalHealthDistressViz-container'}, mentalHealthDistressData);

            }
            

            // Toggle block - switching between town views and the 'All Towns' filter
            d3.select("#townInsHeatmapViz-container").html("");
            d3.select("#townInsRateViz-container").html("");
            d3.select("#ageUninsViz-container").html("");

            if (activeTown == "All") {
                let heatmapData = data.filter(d => d.year == activeYear);
                townHeatmap = new TownHeatmap({parentElement: "#townInsHeatmapViz-container"}, heatmapData);

                let townInsRateData = data.filter(d => d.year == activeYear);
                townInsRate = new TownInsRate({parentElement: "#townInsRateViz-container"}, townInsRateData);

                let townUninsByAgeData = data.filter(d => d.year == activeYear); 
                townUninsByAgeChart = new TownUninsByAgeChart({parentElement:"#ageUninsViz-container"}, townUninsByAgeData);

            }
            else{
                let coverageData = data.filter(d => d.Town == activeTown && d.year == activeYear);
                insCoverageTypeBar = new CoverageTypeBar({parentElement: '#townInsHeatmapViz-container'}, coverageData);

                let ageUninsTrendData = data.filter(d => d.Town == activeTown);
                ageUninsTrendChart = new AgeUninsTrendChart({parentElement: '#ageUninsViz-container'}, ageUninsTrendData);

            }

        });
    });  

}); // End of main bracket for nmeck acs data


/**
 * Sub topic nav bar toggle --> Switches between subtopics 
 */

document.querySelectorAll(".subtopic-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".subtopic-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");

        const selectedSubtopic = this.dataset.subtopic; 

        document.querySelectorAll(".subtopic-content").forEach(function(section) {
            section.style.display = "none";
        });

        const targetSection = document.getElementById(`${selectedSubtopic}-content`);
        if(targetSection) {
            targetSection.style.display = "block";
        }
    });
});








/**
 * PLACES Data Visualizations
 */


d3.csv('data/All_Towns_PLACES_data.csv')
   .then(_data => {
    placesData = _data;

    placesData.forEach(d => {
        d.Year = +d.Year; 
        d.Data_Value = +d.Data_Value; 
        d.Low_Confidence_Limit = +d.Low_Confidence_Limit; 
        d.High_Confidence_Limit = +d.High_Confidence_Limit;
        d.Town = d.LocationName; // Create a 'Town' alias for consistent naming with the other data.

    }); 

    // The diabetes chart is created in the .then() block at the very first code block
    // because it needs to be within the town click handlers. 

    // Depression dumbbell chart (For All towns)
    let depressionDumbbell = new DepressionDumbbell({parentElement: "#depressionViz-container"}, placesData);


}); // closes the PLACES .then()
