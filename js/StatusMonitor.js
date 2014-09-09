var StatusMonitor = new Class({
	aMonitorData: [],
	oCounterData: {},
	aGlobalLog: [],
	oCountries: {},
	oLogTypes: {
		'1': 'down',
		'2': 'up',
		'98': 'started',
		'99': 'paused'
	},

	initialize: function () {
		jsonUptimeRobotApi = this.onWebserviceResponseHandler.bind(this);
		this.onNavClickReference = this.onNavClickHandler.bind(this);
		this.onSelectChangeReference = this.onSelectChangeHandler.bind(this);

		this.onConfigLoadedReference = this.onConfigLoadedHandler.bind(this);
		this.onDictionaryLoadedReference = this.onDictionaryLoadedHandler.bind(this);

		this.addEventHandler();
		
		this.loadConfig('config/config.js');

//		this.loadApiData();
	},
	addEventHandler: function () {
		document.body.addEvent('click:relay(nav ul li)', this.onNavClickReference);
		document.body.addEvent('change:relay(#country-selector select)', this.onSelectChangeReference);
	},
	/**
	 * loadConfig
	 * @return {[type]} [description]
	 */
	loadConfig: function(sConfigFile)
	{
		this.oRequest = new Request.JSON({
			url: sConfigFile,
			method: 'get',
			onSuccess: this.onConfigLoadedReference
		}).send();

	},

	/**
	 * load dictionary
	 */
	loadDictionary: function(sDictionaryFile)
	{
		this.oRequest = new Request.JSON({
			url: sDictionaryFile,
			method: 'get',
			onSuccess: this.onDictionaryLoadedReference
		}).send();
	},

	loadApiData: function () {
		this.oRequest = new Request.JSONP({
			url: 'http://api.uptimerobot.com/getMonitors?apiKey=' + this.oConfig.apikey + '&logs=1&responseTimes=1&responseTimesAverage=180&customUptimeRatio=7-30-45&format=json',
			method: 'get'
		}).send();
	},

	onConfigLoadedHandler: function(oConfig)
	{
		this.oConfig = oConfig;
		this.loadDictionary(this.oConfig.lang.en);
	},

	onDictionaryLoadedHandler: function(oDictionary)
	{
		this.oDic = oDictionary;

		$$('[data-lang]').each(function(oElement)
		{
			oElement.set('html', this.oDic[oElement.get('data-lang').split('dic-').join('')]).erase('data-lang');
		}.bind(this));

		this.loadApiData();
	},

	onWebserviceResponseHandler: function (oResult) {
		if (oResult.stat == 'ok') {
			this.aMonitorData = oResult.monitors.monitor;
			this.updateTabData();
		}
	},
	onNavClickHandler: function (oEvent) {
		var oListItem = oEvent.target;
		if (oListItem.get('tag') !== 'li') {
			oListItem = oListItem.getParent('li');
		}
		if (oListItem.get('data-tab') !== '') {
			if(oListItem.get('data-tab') !==  'all')
			{
				$$('nav ul li').removeClass('active');
				oListItem.addClass('active');
				$$('section.monitor-page').removeClass('active');
				$$('section#' + oListItem.get('data-tab') + '-watch').addClass('active');
				$$('main').removeClass('all');
			}
			else
			{
				$$('nav ul li').removeClass('active');
				oListItem.addClass('active');
				$$('section.monitor-page').addClass('active');
				$$('section#dashboard-watch').removeClass('active');
				$$('main').addClass('all');
			}
		}
	},
	showTab: function(iTabId)
	{
		$$('nav ul li').removeClass('active');
		$$('nav ul li')[iTabId].addClass('active');
		$$('section.monitor-page').removeClass('active');
		$$('section#' + $$('nav ul li')[iTabId].get('data-tab') + '-watch').addClass('active');
		$$('main').removeClass('all');

	},
	onSelectChangeHandler: function(oEvent)
	{
		var i,
			aOptions = document.id('country-selector').getElements('option');

		for(i = aOptions.length; i--;)
		{
			if(aOptions[i].selected)
			{
				if(aOptions[i].value === 'reset')
				{
					$$('.monitor').removeClass('hidden');
					$$('[data-tab="all"]').addClass('hidden');
					this.showTab(0);
					break;
				}
				$$('[data-tab="all"]').removeClass('hidden');
				$$('.monitor[data-country=' + aOptions[i].value + ']').removeClass('hidden');
			}
			else
			{
				$$('.monitor[data-country=' + aOptions[i].value + ']').addClass('hidden');
			}
		}
	},
	sortLogArray: function(oItemA, oItemB)
	{
		return oItemB.time.getTime() - oItemA.time.getTime();
	},
	updateTabData: function () {
		var i,
			iMax,
			sId;
		this.oCounterData = {};
		this.aGlobalLog = [];
		iMax = this.aMonitorData.length;
		for (i = 0; i < iMax; i++) {
			this.updateMonitor(this.aMonitorData[i]);
		}
		for (sId in this.oCounterData) {
			if (this.oCounterData[sId] > 0) {
				$$('.' + sId + '-amount').set('text', this.oCounterData[sId]).getParent().addClass('error');
			}
			else {
				$$('.' + sId + '-amount').set('text', '').getParent().removeClass('error');
			}
		}

		this.updateGlobalLog();
		this.updateCountryFilter();

		$$('.last-changed').set('text', this.oDic['last-changed'].split('%s').join((new Date()).toLocaleString()));
		this.loadApiData.delay(this.oConfig.delay * 1000, this);
	},
	/**
	 * [updateCountryFilter description]
	 * @return {[type]} [description]
	 */
	updateCountryFilter: function()
	{
		var sId;
		for(sId in this.oCountries)
		{
			if(document.id('country-selector').getElements('option.lang-' + sId).length > 0)
			{
				continue;
			}
			document.id('country-selector').getElement('select').adopt(new Element('option', {'class': 'lang-' + sId, 'value': sId, 'text': sId}));
		}	
	},
	/**
	 * Creates a list of all events off all monitors, grouped by the monitors
	 * 
	 * @return {[type]} [description]
	 */
	updateGlobalLog: function()
	{
		var aElements = [],
			sId,
			oLastLogs = {};
		this.aGlobalLog.sort(this.sortLogArray);
		iMax = this.aGlobalLog.length;
		for(i = 0; i < iMax; i++)
		{
			if(typeof oLastLogs[this.aGlobalLog[i].monitor] !== 'undefined' && typeof oLastLogs[this.aGlobalLog[i].monitor].down !== 'undefined')
			{
				continue;
			}
			if(typeof oLastLogs[this.aGlobalLog[i].monitor] === 'undefined')
			{
				oLastLogs[this.aGlobalLog[i].monitor] = {};
			}
			if(typeof oLastLogs[this.aGlobalLog[i].monitor][this.aGlobalLog[i].type] === 'undefined')
			{
				oLastLogs[this.aGlobalLog[i].monitor][this.aGlobalLog[i].type] = this.aGlobalLog[i].time.toLocaleString();
			}
		}
		for(sId in oLastLogs)
		{
			aElements.push(
				new Element('tr', {'class': (typeof oLastLogs[sId].up === 'undefined' ? 'down' : 'up')}).adopt([
					new Element('td', {'text': sId}),
					new Element('td', {'text': oLastLogs[sId].down || '-'}),
					new Element('td', {'text': oLastLogs[sId].up || '-'})
				])
			);
		}
		document.id('dashboard-watch').getElement('.logs tbody').empty().adopt(aElements);
		oLastLogs = null;


	},
	updateMonitor: function (oMonitorData) {
		var i,
			iMax,
			oData,
			aLogs,
			sGameId = oMonitorData.friendlyname.split(' ')[0].toLowerCase(),
			sCountry = oMonitorData.friendlyname.split(' ')[1].toLowerCase(),
			sMonitorId = 'monitor-' + oMonitorData.friendlyname.split(' ').join('-'),
			sContainerId = sGameId + '-watch',
			aResponseTimeData = [];

		if (document.id(sContainerId) === null) {
			new Element('section', {'class': 'monitor-page', 'id': sGameId + '-watch'}).adopt([
				new Element('h2', {'text': this.oDic['nav-label-' + sGameId]}),
				new Element('ul', {'class': 'monitors'})
			]).inject($$('main')[0]);
		}
		if($$('nav li[data-tab=' + sGameId + ']').length === 0)
		{
			new Element('li', {'data-tab': sGameId}).adopt([
				new Element('span', {'text': this.oDic['nav-label-' + sGameId]}),
				new Element('span', {'class': 'amount ' + sGameId + '-amount'})
			]).inject($$('nav ul')[0]);
		}

		if(typeof this.oCountries[sCountry] === 'undefined')
		{
			this.oCountries[sCountry] = 0;
		}
		this.oCountries[sCountry] += 1;

		if (typeof this.oCounterData[sGameId] === 'undefined' || this.oCounterData[sGameId] === null) {
			this.oCounterData[sGameId] = 0;
		}
		if (!document.id(sMonitorId)) {
			new Element('li', {
				'id': sMonitorId,
				'class': 'monitor',
				'data-country': sCountry,
				'data-game': sGameId
			}).adopt([
				new Element('h3').adopt([
					new Element('a', {
						'href': oMonitorData.url,
						'class': 'url',
						'text': oMonitorData.friendlyname
					}),
					new Element('span', {'class': 'status'})
				]),
				new Element('span', {'class': 'country-' + sCountry}),
				new Element('span', {'class': 'game-' + sGameId}),
				new Element('div', {'class': 'uptimes'}).adopt([
								new Element('h4', {
						'text': this.oDic['monitor-uptime-header']
					}),
								new Element('span', {
						'class': 'uptime uptime-7',
						'text': '0'
					}),
								new Element('span', {
						'class': 'uptime uptime-30',
						'text': '0'
					}),
								new Element('span', {
						'class': 'uptime uptime-45',
						'text': '0'
					})
							]),
							new Element('div', {
					'class': 'response-time'
				}).adopt([
								new Element('h4', {
						'text': this.oDic['monitor-response-time-header']
					}),
								new Element('div', {
						'class': 'ct-chart'
					})
							]),
							new Element('h4', {
					'text': this.oDic['monitor-logs-header']
				}),
							new Element('div', {
					'class': 'loglist'
				}).adopt(new Element('ol', {
					'class': 'logs'
				}))
						]).inject(document.id(sContainerId).getElement('ul'));
		}
		switch (oMonitorData.status) {
		case '0':
			document.id(sMonitorId).addClass('paused').removeClass('waiting').removeClass('up').removeClass('seems-down').removeClass('down');
			document.id(sMonitorId).getElement('.status').set('text', this.oDic['monitor-status-paused']).set('class', 'status paused');
			break;
		case '1':
			document.id(sMonitorId).addClass('waiting').removeClass('paused').removeClass('up').removeClass('seems-down').removeClass('down');
			document.id(sMonitorId).getElement('.status').set('text', this.oDic['monitor-status-waiting']).set('class', 'status waiting');
			break;
		case '2':
			document.id(sMonitorId).addClass('up').removeClass('waiting').removeClass('paused').removeClass('seems-down').removeClass('down');
			document.id(sMonitorId).getElement('.status').set('text', this.oDic['monitor-status-up']).set('class', 'status up');
			break;
		case '8':
			this.oCounterData[sGameId] += 1;
			document.id(sMonitorId).addClass('seems-down').removeClass('waiting').removeClass('up').removeClass('paused').removeClass('down');
			document.id(sMonitorId).getElement('.status').set('text', this.oDic['monitor-status-down']).set('class', 'status seems-down');
			break;
		case '9':
			this.oCounterData[sGameId] += 1;
			document.id(sMonitorId).addClass('paused').removeClass('waiting').removeClass('up').removeClass('seems-down').removeClass('paused');
			document.id(sMonitorId).getElement('.status').set('text', this.oDic['monitor-status-down']).set('class', 'status down');
			break;
		}
		oMonitorData.customuptimeratio.split('-').each(function (sValue, iIndex) {
			document.id(sMonitorId).getElements('.uptime')[iIndex].set('text', sValue);
		});
		aLogs = [];
		oMonitorData.log.each(function (oLogData) {
			this.aGlobalLog.push({'time': new Date(oLogData.datetime), 'monitor': oMonitorData.friendlyname, 'type': this.oLogTypes[oLogData.type]});
			aLogs.push(new Element('li', {
				'class': this.oLogTypes[oLogData.type]
			}).adopt([
					new Element('span', {
					'class': 'date',
					'text': new Date(oLogData.datetime).toLocaleString()
				}),
					new Element('span', {
					'class': 'desc',
					'text': this.oLogTypes[oLogData.type]
				})
				]));
		}.bind(this));
		document.id(sMonitorId).getElement('.logs').empty().adopt(aLogs);
		if (typeof oMonitorData.responsetime !== 'undefined' && oMonitorData.responsetime.length > 2) {
			iMax = oMonitorData.responsetime.length;
			oData = {
				'labels': [],
				'series': [[]]
			};
			for (i = iMax; i--;) {
				sId = oMonitorData.responsetime[i].datetime.split(' ')[1];
				sId = sId.split(':')[0] + ':' + sId.split(':')[1];
				oData.labels.push(sId);
				oData.series[0].push(Number(oMonitorData.responsetime[i].value));
			}
			try {
				Chartist.Line(document.id(sMonitorId).getElement('.ct-chart'), oData, {
					'width': '400',
					'height': '150',
					'color': '#00ff00'
				});
			}
			catch (oError) {
				//console.error(oError);
			}
		}
	}
});