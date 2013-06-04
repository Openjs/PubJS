define(function(require, exports){

	/**
	 * 作者信息显示配置
	 * @type {Object}
	 */
	var credits = {
		enabled:false,
		position:{
			align: 'left',
			x: 10
		}
	};
	var colors = [];
	var color = 0;
	for (var i=0; i<36; i++){
		colors.push(util.hsb2rgb(color, 0.33, 0.88));
		color += 130;
	}

	exports.line = {
		chart: {
			defaultSeriesType: 'line',
			margin: [ 50, 60, 100, 60],
			backgroundColor:null,
			borderColor:null,
			style:{
				fontFamily: "'Microsoft YaHei',Verdana, Arial, Helvetica, sans-serif"
			}
		},
		credits:credits,
		title: {},
		subtitle: {},
		colors:colors,
		xAxis: {
			labels: {
				//rotation: -45,
				align: 'right',
				style: {
					 font: 'normal 11px Arial, sans-serif'
				},
				step:3
			}
		},
		yAxis: {
			title: {
				text: ""
			},
			min:0,
			gridLineColor:"#f8f8f8",
			plotLines: [{
				value: 0,
				width: 1,
				color: '#808080'
			}]
		},
		tooltip: {
			formatter: function() {
					return '<b>'+ this.series.name +'</b><br/>'+this.x +': '+ this.y;
			}
		},
		legend: {
			align: 'right',
			verticalAlign: 'top',
			borderColor:"#cccccc",
			x:-50
		},
		series: []
	};

	return {
		"line":,
		"spline":{
			chart: {
				defaultSeriesType: 'spline',
				marginRight: 10
			},
			title: {
				text: null
			},
			xAxis: {
				type:'datetime',
				tickPixelInterval: 150
			},
			yAxis: {
				title: {
					text:null
				},
				plotLines: [{
					value: 0,
					width: 1,
					color: '#808080'
				}]
			},
			legend: {
				enabled: false
			},
			exporting: {
				enabled: false
			},
			series: []
		},
		"column":{
			"chart": {
				defaultSeriesType: 'column',
				backgroundColor:null,
				borderColor:null,
				style:{
					fontFamily: "'Microsoft YaHei',Verdana, Arial, Helvetica, sans-serif"
				}
			},
			"credits":credits,
			"tooltip": {
				formatter: function() {
						return '<b>'+ this.series.name +'</b><br/>'+this.x +': '+ this.y;
				}
			},
			"colors":colors,
			title: {
				text:null,
				style:{
					display:"none"
				}
			},
			"subtitle":{},
			"plotOptions": {
				column: {
					pointPadding: 0.2,
					borderWidth: 0
				},
				series: {
					shadow: false
				}
			},
			"legend": {
				layout: 'vertical',
				backgroundColor: '#FFFFFF',
				align: 'left',
				verticalAlign: 'top',
				x: 20,
				y: 20,
				floating: true,
				shadow: true
			},
			yAxis:{
				title: {
					text: ""
				},
				gridLineColor:"#f8f8f8",
				min:0
			},
			xAxis:{
				labels: {
					//rotation: -45,
					align: 'right',
					style: {
						 font: 'normal 11px Arial, sans-serif'
					},
					step:3
				}
			},
			"series":[]
		},
		"area":{
			chart: {
				defaultSeriesType: 'area',
				backgroundColor:null,
				borderColor:null,
				margin: [ 50, 2, 60, 30],
				style:{
					fontFamily: "'Microsoft YaHei',Verdana, Arial, Helvetica, sans-serif"
				}
			},
			title: {
				text: null
			},
			"credits":credits,
			"colors":colors,
			xAxis: {
				gridLineWidth: 1,
				tickInterval:3,
				tickmarkPlacement:'on',
				gridLineDashStyle: 'longdash',
				gridLineColor: '#c0e8f0',
				labels: {
					//rotation: -45,
					style: {
						 font: 'normal 11px Verdana, sans-serif'
					},
					step:1
				}
			},
			yAxis: {
				title: {
					text:null
				},
				gridLineColor:"#eeeeee",
				gridLineDashStyle: 'longdash',
				min:0,
				plotLines: [{
					value: 0,
					width: 1,
					color: '#808080'
				}]
			},
			tooltip: {
				shared: true,
				crosshairs: {
					width: 1,
					color: 'red',
					dashStyle: 'DashDot'
				},
				backgroundColor:'#ffffff'
				//formatter: function() {
					//return '<b>'+ this.series.name +'</b><br/>'+this.x +': '+ this.y;
				//}
			},
			plotOptions: {
				area: {
					/*
					lineColor: '#666666',
					lineWidth: 1,
					marker: {
						lineWidth: 1,
						lineColor: '#666666'
					},
					*/
					lineWidth: 1,
					fillOpacity: 0.1,
					shadow:false
				},
				series:{
					lineWidth: 1,
					marker: {
						lineWidth: 1,
						symbol: "circle"
					}
				}
			},
			legend: {
				borderWidth:0
			},
			series: []
		},
		"pie":{
			chart: {
				plotBackgroundColor: null,
				plotBorderWidth: null,
				plotShadow: false,
				backgroundColor:null,
				borderColor:null,
				defaultSeriesType: 'pie'
			},
			"credits":credits,
			tooltip: {
				formatter: function() {
					return '<b>'+ this.point.name +'</b>: '+ this.y +' %';
				}
			},
			plotOptions: {
				pie: {
					allowPointSelect: true,
					cursor: 'pointer',
					dataLabels: {
						//enabled: false
					}
				}
			},
			series: []
		}
	}
});