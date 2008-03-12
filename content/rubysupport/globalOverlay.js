var RubyService = 
{
	initialized : false,

	useGlobalStyleSheets : false,

	XHTMLNS : 'http://www.w3.org/1999/xhtml',
	RUBYNS  : 'http://piro.sakura.ne.jp/rubysupport',

	kSTATE : 'moz-ruby-parsed',
	kTYPE  : 'moz-ruby-type',
	kPOSITIONED : 'moz-ruby-vertical-position-corrected',

	kDONE     : 'moz-ruby-parsed',
	kLOADED   : 'moz-ruby-stylesheet-loaded',
	kEXPANDED : 'moz-ruby-expanded-abbr',

	get SSS()
	{
		if (this._SSS === void(0)) {
			if ('@mozilla.org/content/style-sheet-service;1' in Components.classes) {
				this._SSS = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
			}
			if (!this._SSS)
				this._SSS = null;
		}
		return this._SSS;
	},
//	_SSS : null,

	get IOService()
	{
		if (!this._IOService)
			this._IOService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		return this._IOService;
	},
	_IOService : null,

	get XULAppInfo()
	{
		if (!this._XULAppInfo)
			this._XULAppInfo = Components.classes['@mozilla.org/xre/app-info;1']
				.getService(Components.interfaces.nsIXULAppInfo);
		return this._XULAppInfo;
	},
	_XULAppInfo : null,
	get isGecko18OrLater()
	{
		if (!('_isGecko18OrLater' in this)) {
			var version = this.XULAppInfo.platformVersion.split('.');
			this._isGecko18OrLater = parseInt(version[0]) >= 1 || parseInt(version[1]) >= 8;
		}
		return this._isGecko18OrLater;
	},
	get isGecko19OrLater()
	{
		if (!('_isGecko19OrLater' in this)) {
			var version = this.XULAppInfo.platformVersion.split('.');
			this._isGecko19OrLater = parseInt(version[0]) >= 1 || parseInt(version[1]) >= 9;
		}
		return this._isGecko19OrLater;
	},
	 
	updateGlobalStyleSheets : function() 
	{
		if (!this.useGlobalStyleSheets) return;

		var enabled = nsPreferences.getBoolPref('rubysupport.general.enabled');

		var sheet = this.IOService.newURI('chrome://rubysupport/content/styles/ruby.css', null, null);
		if (
			enabled &&
			!this.SSS.sheetRegistered(sheet, this.SSS.AGENT_SHEET)
			) {
			this.SSS.loadAndRegisterSheet(sheet, this.SSS.AGENT_SHEET);
		}
		else if (
			!enabled &&
			this.SSS.sheetRegistered(sheet, this.SSS.AGENT_SHEET)
			) {
			this.SSS.unregisterSheet(sheet, this.SSS.AGENT_SHEET);
		}


		sheet = this.IOService.newURI('chrome://rubysupport/content/styles/ruby-abbr-nopseuds.css', null, null);
		if (
			enabled && nsPreferences.getBoolPref('rubysupport.abbrToRuby.noPseuds') &&
			!this.SSS.sheetRegistered(sheet, this.SSS.AGENT_SHEET)
			)
			this.SSS.loadAndRegisterSheet(sheet, this.SSS.AGENT_SHEET);
		else if (
			(!enabled || !nsPreferences.getBoolPref('rubysupport.abbrToRuby.noPseuds')) &&
			this.SSS.sheetRegistered(sheet, this.SSS.AGENT_SHEET)
			)
			this.SSS.unregisterSheet(sheet, this.SSS.AGENT_SHEET);
	},
 
	processFrames : function(aFrames) 
	{
		var frame, frameWrapper, docWrapper, nodeWrapper, docShell;
		for (var i = 0, maxi = aFrames.length; i < maxi; i++)
		{
			frame = aFrames[i];
			try {
				frameWrapper = new XPCNativeWrapper(frame, 'frames', 'document');
				docWrapper = new XPCNativeWrapper(frameWrapper.document, 'documentElement');
				nodeWrapper = new XPCNativeWrapper(docWrapper.documentElement,
					'hasAttribute()',
					'setAttribute()'
				);
				if (!nodeWrapper.hasAttribute(this.kDONE)) {
					this.parseRubyNodes(frame);
					docShell = this.getDocShellForFrame(frame);
					if (!docShell.isLoadingDocument)
						nodeWrapper.setAttribute(this.kDONE, true);
				}
			}
			catch(e) {
			}
			try {
				if (frameWrapper.frames)
					this.processFrames(frameWrapper.frames);
			}
			catch(e) {
			}
		}
	},
	getDocShellForFrame : function(aFrame)
	{
		return (new XPCNativeWrapper(aFrame, 'QueryInterface()'))
				.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIWebNavigation)
				.QueryInterface(Components.interfaces.nsIDocShell);
	},
	 
	parseRubyNodes : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document');
		if (!winWrapper.document) return 0;

//if (!aWindow.rubyStart) aWindow.rubyStart = (new Date()).getTime();

		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement');
		var count = 0;

		var ruby = this.evaluateXPath('/descendant::*[contains(" ruby RUBY ", concat(" ", local-name(), " ")) and not(@'+this.kSTATE+')]', docWrapper.documentElement);
		for (var i = ruby.snapshotLength-1; i > -1; i--)
		{
			try {
				this.parseRuby(ruby.snapshotItem(i));
			}
			catch(e) {
//				dump(e+'\n > '+ruby.snapshotItem(i)+'\n');
			}
		}

		count += this.evaluateXPath('/descendant::*[contains(" ruby RUBY ", concat(" ", local-name(), " "))]', docWrapper.documentElement).snapshotLength;

		if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.enabled')) {
			var abbr = this.evaluateXPath(
						'/descendant::*[contains(" abbr ABBR ", concat(" ", local-name(), " ")) and @title and not(@title = "") and not(@'+this.kSTATE+')]',
						docWrapper.documentElement,
						XPathResult.ORDERED_NODE_ITERATOR_TYPE
					);
			var abbrNode;
			while (abbrNode = abbr.iterateNext())
			{
				try {
					var nodeWrapper = new XPCNativeWrapper(abbrNode, 'setAttribute()');
					nodeWrapper.setAttribute(this.kSTATE, 'progress');
					this.parseAbbr(abbrNode);
					nodeWrapper.setAttribute(this.kSTATE, 'done');
					if (this.isGecko19OrLater)
						nodeWrapper.setAttribute(this.kTYPE, 'inline-table');
					this.delayedCorrectVerticalPosition(abbrNode);
				}
				catch(e) {
	//				dump(e+'\n > '+abbr[i]+'\n');
				}
			}

			count += this.evaluateXPath('/descendant::*[contains(" abbr ABBR ", concat(" ", local-name(), " ")) and @title and not(@title = "")]', docWrapper.documentElement).snapshotLength;
		}

		if (count) {
//			window.setTimeout(function(aSelf, aWindow) {
//				aSelf.correctVerticalPositionsIn(aWindow);
//			}, 0, this, aWindow);

			// Apply Stylesheet (legacy operation, for old Mozilla)
			if (!this.useGlobalStyleSheets) {
				var nodeWrapper = new XPCNativeWrapper(docWrapper.documentElement, 'hasAttribute()');
				if (!nodeWrapper.hasAttribute(this.kLOADED))
					this.setRubyStyle(aWindow);
			}
		}

//dump('ruby parsing: '+((new Date()).getTime()-aWindow.rubyStart) +'msec\n');
		return count;
	},
	 
	parseRuby : function(aNode) 
	{
		var nodeWrapper = new XPCNativeWrapper(aNode,
				'ownerDocument',
				'setAttribute()'
			);
		var docWrapper = new XPCNativeWrapper(nodeWrapper.ownerDocument,
				'compatMode',
				'contentType',
				'doctype',
				'createElementNS()'
			);

		nodeWrapper.setAttribute(this.kSTATE, 'progress');


		// ����݊����[�h���邢�͔�XHTML�̏ꍇ�ł̂݃^�O�̕⊮���s��
		if (docWrapper.compatMode == 'BackCompat' ||
			docWrapper.contentType == 'text/html' ||
			!/XHTML/.test(docWrapper.doctype.publicId))
			this.fixUpMSIERuby(aNode);


		// rbspan�t����rt��td�ŕ��
		// �}�[�N�A�b�v��j�󂷂�̂ŋX�����Ȃ����ǁA�ǂ������o�n�u���E�U�����c�c�i����
		var rtcs = this.evaluateXPath('descendant::*[contains(" rtc RTC ", concat(" ", local-name(), " "))]', aNode);
		if (rtcs.snapshotLength) {
			var rts = this.evaluateXPath('descendant::*[contains(" rt RT ", concat(" ", local-name(), " ")) and @rbspan and not((@rbspan = "") or (number(@rbspan) < 2) or parent::xhtml:td)]', aNode);

			var tmp_td, tmp_td_content;
			var rtWrapper, parentWrapper;
			for (var i = rts.snapshotLength-1; i > -1; i--)
			{
				rtWrapper = new XPCNativeWrapper(rts.snapshotItem(i),
						'getAttribute()',
						'parentNode'
					);
				parentWrapper = new XPCNativeWrapper(rtWrapper.parentNode,
						'localName',
						'replaceChild()'
					);

				tmp_td = docWrapper.createElementNS(this.XHTMLNS, 'td');
				tmp_td.setAttribute('moz-ruby-inserted', true);
				tmp_td.setAttribute('colspan', rtWrapper.getAttribute('rbspan'));
				// �ȉ���2�s�́A��s�ɂ܂Ƃ߂ď������Ƃ���Ɖ��̂��G���[�ɂȂ�
				tmp_td_content = parentWrapper.replaceChild(tmp_td, rts.snapshotItem(i));
				tmp_td.appendChild(tmp_td_content);
			}
		}

		nodeWrapper.setAttribute(this.kSTATE, 'done');
		if (this.isGecko19OrLater)
			nodeWrapper.setAttribute(this.kTYPE, 'inline-table');
		this.delayedCorrectVerticalPosition(aNode);
	},
	 
	// IE�p�̃}�[�N�A�b�v��XHTML�̎d�l�ɏ����������̂ɏC�� 
	fixUpMSIERuby : function(aNode)
	{
try{
		var namespace = this.isGecko18OrLater ? this.XHTMLNS : this.RUBYNS;

		var i, j;
		var nodeWrapper = new XPCNativeWrapper(aNode,
				'nextSibling',
				'parentNode',
				'childNodes',
				'firstChild',
				'lastChild',
				'insertBefore()',
				'removeChild()',
				'ownerDocument'
			);
		var docWrapper = new XPCNativeWrapper(nodeWrapper.ownerDocument,
				'defaultView',
				'createElementNS()'
			);

		/*
			���G���r���g�p����Ă���ꍇ�A���̏����͍s��Ȃ��B
			�iXHTML�ł͏I���^�O�͏ȗ����꓾�Ȃ��̂Łj
		*/
		var rbcs = this.evaluateXPath('descendant::*[contains(" rbc RBC ", concat(" ", local-name(), " "))]', aNode);
		if (rbcs.snapshotLength) return;


		/*
			�I���^�O���ȗ����ꂽ���߂ɔj�󂳂ꂽ�}�[�N�A�b�v���C������B
			written by Takeshi Nishimura

			�ȉ��A
			* RB,RP,RT�v�f���܂Ƃ߂āuRUBY�\���v�f�v�A
			* �c���[���RUBY�m�[�h�̎q�m�[�h�̊K�w���u���x��1�v�K�w�A
			* �c���[���RUBY�m�[�h�̑��m�[�h�̊K�w���u���x��2�v�K�w�A
			* �c���[���RUBY�m�[�h�Ɠ����x���̊K�w���u���x��0�v�K�w�A
			�ƌĂԁB
			1) ���x��1�̃m�[�h��擪���珇�Ɍ��Ă����ARUBY�\���v�f������΂��̃��x��2�m�[�h������B���x��2��RUBY�\���v�f������΁A���̒��O�ɏI���^�O���ȗ�����Ă���Ƃ������ƂȂ̂ł���ȍ~�S�Ă����x��1�ɒǂ��o���B�i�ǂ��o���ꂽ�m�[�h�͌��ʓI�Ɏ��ȍ~�̃��x��1�����ΏۂƂȂ�j
			2) 1���I��������A�ēx���x��1������B�Ō��RUBY�\���v�f�̌�ɑ��̗v�f������΂��̒��O�ɏI���^�O���ȗ�����Ă���Ƃ������ƂȂ̂ł��������x��0�ɒǂ��o���B
		*/


		var range = nodeWrapper.ownerDocument.createRange();
		var notClosedRubyElements,
			childRubyElement,
			movedContents;

		// �܂��A�����Ă��Ȃ��^�O�ɂ���Ĕj�󂳂ꂽ�c���[�𕜌�����B
		while (
			(
				notClosedRubyElements = this.evaluateXPath(
					'child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))][child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))]]',
					aNode
				)
			).snapshotLength
			)
		{
			childRubyElement = this.evaluateXPath(
				'child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))]',
				notClosedRubyElements.snapshotItem(0)
			);

			range.selectNodeContents(notClosedRubyElements.snapshotItem(0));
			range.setStartBefore(childRubyElement.snapshotItem(0));
			movedContents = range.extractContents();

			range.selectNodeContents(aNode);
			range.setStartAfter(notClosedRubyElements.snapshotItem(0));
			range.setEndAfter(notClosedRubyElements.snapshotItem(0));
			range.insertNode(movedContents);
		}


		// �}�[�N�A�b�v����Ă��Ȃ�rb���}�[�N�A�b�v�������B
		// rt���O�ɂ�����̂͂��ׂ�rb�ɂ���B
		var rts = this.evaluateXPath('child::*[contains(" rt RT ", concat(" ", local-name(), " "))]', aNode);
		var startWrapper,
			startNextWrapper,
			endWrapper,
			endPreviousWrapper,
			rangeContents,
			rangeContentWrapper;
		for (i = rts.snapshotLength-1; i > -1; i--)
		{
			range.selectNodeContents(aNode);

			// <ruby>hoge<rp>(</rp><rt>foobar</rt><rp>)</rp></ruby>
			// �Ƃ�������rp�����݂���Ƃ��́A
			// <ruby>[hoge<rp>(</rp>]<rt>foobar</rt><rp>)</rp></ruby>
			// �Ƃ����rp�܂�rb���ɓ�����Ă��܂��̂ŁA
			// <ruby>[hoge]<rp>(</rp><rt>foobar</rt><rp>)</rp></ruby>
			// �Ƃ�������Range�̊J�n�ʒu�E�I���ʒu��rp�������ʒu�Ɉړ����Ă��Ȃ��Ƃ����Ȃ��B
			if (i > 0) {
				startWrapper = new XPCNativeWrapper(rts.snapshotItem(i-1), 'nextSibling');
				startNextWrapper = new XPCNativeWrapper(startWrapper.nextSibling, 'localName');
				if (startNextWrapper.localName &&
					startNextWrapper.localName.toLowerCase() == 'rp')
					range.setStartAfter(startWrapper.nextSibling);
				else
					range.setStartAfter(rts.snapshotItem(i-1));
			}

			endWrapper = new XPCNativeWrapper(rts.snapshotItem(i), 'previousSibling');
			endPreviousWrapper = new XPCNativeWrapper(endWrapper.previousSibling, 'localName');
			if (endPreviousWrapper.localName &&
				endPreviousWrapper.localName.toLowerCase() == 'rp')
				range.setEndBefore(endWrapper.previousSibling);
			else
				range.setEndBefore(rts.snapshotItem(i));

			// ���r�e�L�X�g���O�ɂ���̂��P���rb�v�f�Ȃ�A
			// �}�[�N�A�b�v��␳����K�v�͂Ȃ��̂ŁA�����ŏ������I����B
			rangeContents = range.cloneContents();
			if (!rangeContents.childNodes.length) continue;
			if (rangeContents.childNodes.length == 1) {
				rangeContentWrapper = new XPCNativeWrapper(rangeContents.firstChild, 'nodeType');
				if (
					rangeContentWrapper.nodeType == Node.ELEMENT_NODE &&
					(rangeContentWrapper = new XPCNativeWrapper(rangeContents.firstChild, 'localName')).localName.toLowerCase() == 'rb'
					)
					continue;
			}

			containerRubyBase = docWrapper.createElementNS(namespace, 'rb');
			containerRubyBase.appendChild(range.extractContents());
			range.insertNode(containerRubyBase);

			// �V������������rb�̒��ɂ��ׂĂ܂Ƃ߂ĂԂ�����ł��邽�߁A
			// <ruby>hoge<rb></rb><rt>foobar</rt></ruby> �̂悤�ȃ}�[�N�A�b�v��
			// <ruby><RB>hoge<rb></rb></RB><rt>foobar</rt></ruby> �Ƃ������ɂȂ��Ă��܂��Ă���B
			// �Ȃ̂ŁA�����œ���q�ɂȂ���rb���폜���Ă����B
			rangeContents = this.evaluateXPath('child::*[contains(" rb RB ", concat(" ", local-name(), " "))]', containerRubyBase);
			for (var j = rangeContents.snapshotLength-1; j > -1; j--)
			{
				range.selectNodeContents(rangeContents.snapshotItem(j));
				movedContents = range.extractContents();

				range.selectNode(rangeContents.snapshotItem(j));
				range.deleteContents();
				range.insertNode(movedContents);
			}
		}


		// 2�߂�rb�ȍ~�A���邢�͍Ō�̃��r�֘A�v�f������̗v�f�́A���ׂĊO�ɒǂ��o���B
		var nextStart = this.evaluateXPath(
			'(child::*[contains(" rb RB ", concat(" ", local-name(), " "))][2] | child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))][last()]/following-sibling::node()[1])',
			aNode
		);
		if (nextStart.snapshotLength) {
			var shouldCreateNewRubyElement = this.evaluateXPath('child::*[contains(" rb RB ", concat(" ", local-name(), " "))][2]', aNode).snapshotLength > 0;

			range.selectNodeContents(aNode);
			range.setStartBefore(nextStart.snapshotItem(0));
			movedContents = range.extractContents();

			if (shouldCreateNewRubyElement) {
				var newRubyElement = docWrapper.createElementNS(namespace, 'ruby');
				newRubyElement.appendChild(movedContents);
				movedContents = newRubyElement;
			}

			range.selectNodeContents(nodeWrapper.parentNode);
			range.setStartAfter(aNode);
			range.setEndAfter(aNode);
			range.insertNode(movedContents);
			if (shouldCreateNewRubyElement)
				this.parseRuby(movedContents);
		}


		// ��������rt���A��ɂ܂Ƃ߂�
		var rts = this.evaluateXPath('child::*[contains(" rt RT ", concat(" ", local-name(), " "))]', aNode);
		if (rts.snapshotLength > 1) {
			var text = docWrapper.createElementNS(namespace, 'rtc-ie');
			nodeWrapper.insertBefore(text, rts.snapshotItem(0));

			for (i = rts.snapshotLength-1; i > -1; i--)
				text.insertBefore(nodeWrapper.removeChild(rts.snapshotItem(i)), text.firstChild);
		}


		// �㑱��DOM�c���[���j�󂳂�Ă���̂ŁA�����I�ɂ�蒼���B
		this.delayedCorrectVerticalPositionsIn(docWrapper.defaultView);
}catch(e){dump(e+'\n');}
	},
  
	parseAbbr : function(aNode) 
	{
		var nodeWrapper = new XPCNativeWrapper(aNode,
				'title',
				'ownerDocument',
				'getAttribute()',
				'setAttribute()'
			);
		var docWrapper = new XPCNativeWrapper(nodeWrapper.ownerDocument,
				'documentElement'
			);
		var rootWrapper = new XPCNativeWrapper(docWrapper.documentElement,
				'getAttribute()',
				'setAttribute()'
			);

		var mode = nsPreferences.getIntPref('rubysupport.abbrToRuby.mode', 0);

		// ���ɓW�J��������͂����W�J���Ȃ�
		var basetext = aNode.textContent;
		var expanded = rootWrapper.getAttribute(this.kEXPANDED) || '';
		var key = encodeURICompoent(basetext+'::'+nodeWrapper.title);
		if (('|'+expanded+'|').indexOf('|'+key+'|') > -1) return;

		nodeWrapper.setAttribute('rubytext', nodeWrapper.title);
		rootWrapper.setAttribute(this.kEXPANDED, (expanded ? expanded + '|' : '' ) + key);

		if (!this.correctVerticalPosition(aNode))
			this.delayedCorrectVerticalPosition(aNode);
	},
 
	// ���r�\���̃X�^�C����ǉ� 
	setRubyStyle : function(targetWindow)
	{
		var winWrapper = new XPCNativeWrapper(targetWindow, 'document');
		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement');
		var nodeWrapper = new XPCNativeWrapper(docWrapper.documentElement,
				'getAttribute()',
				'setAttribute()'
			);
		if (
			!nsPreferences.getBoolPref('rubysupport.general.enabled') ||
			nodeWrapper.getAttribute(this.kLOADED) == 'true'
			)
			return;

		// ���r�p�̃X�^�C���V�[�g��ǉ�����
		this.addStyleSheet('chrome://rubysupport/content/styles/ruby.css', targetWindow);

		if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.noPseuds'))
			this.addStyleSheet('chrome://rubysupport/content/styles/ruby-abbr-nopseuds.css', targetWindow);

		nodeWrapper.setAttribute(this.kLOADED, true);
	},
	
	addStyleSheet : function(path, targetWindow) 
	{
		var winWrapper = new XPCNativeWrapper(targetWindow, 'document');

		var d     = winWrapper.document,
			newPI = document.createProcessingInstruction('xml-stylesheet',
				'href="'+path+'" type="text/css" media="all"');

		var docWrapper = new XPCNativeWrapper(d, 'firstChild', 'insertBefore()');
		docWrapper.insertBefore(newPI, docWrapper.firstChild);
		return;
	},
   
	delayedCorrectVerticalPositionsIn : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document');
		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement');
		var nodeWrapper = new XPCNativeWrapper(docWrapper.documentElement,
				'hasAttribute()',
				'setAttribute()',
				'removeAttribute()'
			);
		var attr = 'moz-rubysupport-delayed-process-timer';
		if (nodeWrapper.hasAttribute(attr)) return;

		var timer = window.setTimeout(function(aSelf) {
			nodeWrapper.removeAttribute(attr);
			aSelf.correctVerticalPositionsIn(aWindow);
		}, 0, this);
		nodeWrapper.setAttribute(attr, timer);
	},
 
	correctVerticalPositionsIn : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document');
		if (!winWrapper.document) return;

		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement');

		var ruby = this.evaluateXPath('/descendant::*[contains(" ruby RUBY ", concat(" ", local-name(), " ")) and @'+this.kSTATE+' = "done" and not(@'+this.kPOSITIONED+')]', docWrapper.documentElement);
		for (var i = ruby.snapshotLength-1; i > -1; i--)
			this.correctVerticalPosition(ruby.snapshotItem(i));
	},
	 
	delayedCorrectVerticalPosition : function(aNode) 
	{
		window.setTimeout(function(aSelf, aNode) {
			aSelf.correctVerticalPosition(aNode);
		}, 0, this, aNode);
	},
 
	correctVerticalPosition : function(aNode) 
	{
		var done = false;

		var node = aNode;
		var nodeWrapper = new XPCNativeWrapper(node,
				'localName',
				'ownerDocument',
				'parentNode',
				'nextSibling',
				'hasAttribute()',
				'setAttribute()'
			);

		if (!nodeWrapper.parentNode ||
			nodeWrapper.hasAttribute(this.kPOSITIONED))
			return;

		var d = nodeWrapper.ownerDocument;
		var docWrapper = new XPCNativeWrapper(nodeWrapper.ownerDocument,
				'getAnonymousNodes()',
				'getBoxObjectFor()',
				'createElementNS()',
				'createTextNode()'
			);

		if (String(nodeWrapper.localName).toLowerCase() != 'ruby') {
			node = docWrapper.getAnonymousNodes(node);
			if (node && node.length)
				node = node[0];
			else
				return;

			nodeWrapper = new XPCNativeWrapper(node,
					'localName',
					'ownerDocument',
					'parentNode',
					'nextSibling',
					'setAttribute()'
				);
		}

		try {
			nodeWrapper.setAttribute('style', 'vertical-align: baseline !important;');

			var base = this.getRubyBase(node);
			if (!base) return; // if we get box object for "undefined", Mozilla makes crash.


			// ���̃{�b�N�X��}�����A�����␳�̊�ɂ���
			var beforeBoxNode = docWrapper.createElementNS(this.RUBYNS, 'dummyBox');
			beforeBoxNode.appendChild(docWrapper.createTextNode('['));
			var afterBoxNode  = docWrapper.createElementNS(this.RUBYNS, 'dummyBox');
			afterBoxNode.appendChild(docWrapper.createTextNode(']'));
			var baseBoxNode  = docWrapper.createElementNS(this.RUBYNS, 'dummyBox');
			baseBoxNode.appendChild(docWrapper.createTextNode('['));

			var baseWrapper = new XPCNativeWrapper(base,
					'firstChild',
					'insertBefore()',
					'removeChild()'
				);
			base.insertBefore(baseBoxNode, base.firstChild);
			var rbBox = docWrapper.getBoxObjectFor(baseBoxNode);

			var parentWrapper = new XPCNativeWrapper(nodeWrapper.parentNode,
					'insertBefore()',
					'removeChild()'
				);
			parentWrapper.insertBefore(beforeBoxNode, node);
			parentWrapper.insertBefore(afterBoxNode, nodeWrapper.nextSibling);

			var beforeBox = docWrapper.getBoxObjectFor(beforeBoxNode);
			var afterBox  = docWrapper.getBoxObjectFor(afterBoxNode);

			var baseBox = (
					Math.abs((rbBox.y+rbBox.height) - (beforeBox.y+beforeBox.height)) >
					Math.abs((rbBox.y+rbBox.height) - (afterBox.y+afterBox.height))
				) ?
					afterBox :
					beforeBox ;

			var offset = (rbBox.y+rbBox.height) - (baseBox.y+baseBox.height);
			if (offset != 0) {
				nodeWrapper.setAttribute('style', 'vertical-align: '+offset+'px !important;');
				nodeWrapper.setAttribute(this.kPOSITIONED, true);
				done = true;
			}

			parentWrapper.removeChild(beforeBoxNode);
			parentWrapper.removeChild(afterBoxNode);
			baseWrapper.removeChild(baseBoxNode);
		}
		catch(e) {
//dump(e+'\n');
		}

		return;
	},
	 
	getRubyBase : function(aNode) 
	{
		var bases = this.evaluateXPath('child::*[contains(" rb rbc RB RBC ", concat(" ", local-name(), " "))]', aNode);
		if (bases.snapshotLength)
			return bases.snapshotItem(0);

		var nodeWrapper = new XPCNativeWrapper(aNode, 'childNodes', 'getElementsByTagName()');
		return nodeWrapper.getElementsByTagName('*')[0];
	},
  	  
	init : function() 
	{
		if (this.initialized) return;
		this.initialized = true;

		try {
			window.removeEventListener('load', this, false);
			window.removeEventListener('load', this, false);
		}
		catch(e) {
		}

		try {
			if (nsPreferences.getBoolPref('rubysupport.general.enabled') === null)
				nsPreferences.setBoolPref('rubysupport.general.enabled', true);

			if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.enabled') === null)
				nsPreferences.setBoolPref('rubysupport.abbrToRuby.enabled', false);

			if (nsPreferences.getIntPref('rubysupport.abbrToRuby.mode') === null)
				nsPreferences.setIntPref('rubysupport.abbrToRuby.mode', 1);

			if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.noPseuds') === null)
				nsPreferences.setBoolPref('rubysupport.abbrToRuby.noPseuds', true);

			if (this.SSS) {
				this.useGlobalStyleSheets = true;
				this.updateGlobalStyleSheets();
			}

			this.overrideFunctions();
		}
		catch(e) {
			dump('CAUTION: XHTML Ruby Support fails to initialize!\n  Error: '+e+'\n');
		}
	},
	 
	overrideFunctions : function() 
	{
		if (window.FillInHTMLTooltip) {
			window.__rubysupport__FillInHTMLTooltip = window.FillInHTMLTooltip;
			window.FillInHTMLTooltip = this.FillInHTMLTooltip;
		}

		// �y�[�W�ǂݍ��ݒ��ɏ������s��
		if (window.nsBrowserStatusHandler) {
			nsBrowserStatusHandler.prototype.__rubysupport__onStateChange = nsBrowserStatusHandler.prototype.onStateChange;
			nsBrowserStatusHandler.prototype.onStateChange = this.onStateChange;

			// �^�u�u���E�U�̏ꍇ�A�e�^�u�ɂ��Ă��������s���B
			var b = document.getElementsByTagNameNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'tabbrowser')[0];
			if (b && b.mTabProgressListener) {
				b.__rubysupport__mTabProgressListener = b.mTabProgressListener;
				if (b.__rubysupport__mTabProgressListener.arity == 3) {
					b.mTabProgressListener = function(aTabBrowserOrTab, aTabOrBrowser, aStartsBlank) // aTab,aBrowser:latest implementation / aTabBrowser,aTab:old implementation
					{
						var ret = (aTabBrowserOrTab.localName == 'tabbrowser' ? aTabBrowserOrTab : this).__rubysupport__mTabProgressListener(aTabBrowserOrTab, aTabOrBrowser, aStartsBlank);
						ret.__rubysupport__onStateChange = ret.onStateChange;
						ret.onStateChange = RubyService.onStateChange;
						return ret;
					};
				}
				else // 1.x-1.4
					b.mTabProgressListener = function(aTab, aStartsBlank)
					{
						var ret = this.__rubysupport__mTabProgressListener(aTab, aStartsBlank);
						ret.__rubysupport__onStateChange = ret.onStateChange;
						ret.onStateChange = RubyService.onStateChange;
						return ret;
					};
			}

			dump('XHTML Ruby Support initialized successfully\n');
		} else {
			dump('CAUTION: XHTML Ruby Support initialization failed!\n');
		}
	},
	 
	FillInHTMLTooltip : function(elem) 
	{
		var popuptext = '',
			target;

		target = RubyService.findParentNodeWithLocalName(elem, 'ruby');

		if (
			target &&
			!(/^\[object .*Document\]$/.test(String(target))) &&
			!RubyService.evaluateXPath('descendant-or-self::*[@title and not(@title = "")]', target).snapshotLength
			) {
			var rtc = RubyService.evaluateXPath('descendant::*[contains(" rtc RTC ", concat(" ", local-name(), " "))]', target);
			if (rtc.snapshotLength) {
				popuptext = rtc.snapshotItem(0).textContent;
				if (rtc.snapshotLength > 1)
					popuptext += ' / '+rtc.snapshotItem(1).textContent;
			}
			else {
				var rt = RubyService.evaluateXPath('descendant::*[contains(" rt RT ", concat(" ", local-name(), " "))]', target);
				popuptext = rt.snapshotItem(0).textContent;
			}
		}

		if (popuptext) {
			var popup = document.getElementById('aHTMLTooltip');
			popup.removeAttribute('label');
			popup.setAttribute('label', popuptext);
			return true;
		}

		return __rubysupport__FillInHTMLTooltip(elem);
	},
	findParentNodeWithLocalName : function(aNode, aLocalName)
	{
		var name = String(aLocalName).toLowerCase();
		var node = aNode;
		while (node &&
			String(Components.lookupMethod(node, 'localName').call(node)).toLowerCase() != name)
			node = Components.lookupMethod(node, 'parentNode').call(node);

		return node;
	},
 
	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) 
	{
		this.__rubysupport__onStateChange(aWebProgress, aRequest, aStateFlags, aStatus);

		if (!aWebProgress) return;

		if (nsPreferences.getBoolPref('rubysupport.general.enabled'))
			RubyService.processFrames([aWebProgress.DOMWindow]);
	},
   
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				break;
		}
	},
 
	evaluateXPath : function(aExpression, aContextNode, aType) 
	{
		const resolver = {
			lookupNamespaceURI : function(aPrefix)
			{
				switch (aPrefix)
				{
					case 'html':
					case 'xhtml':
					default:
						return RubyService.XHTMLNS;
	//					return '';
					case 'ruby':
						return RubyService.RUBYNS;
				}
			}
		};

		try {
			return (aContextNode ? aContextNode.ownerDocument : document ).evaluate(
					aExpression,
					aContextNode || document,
					resolver,
					aType || XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
					{}
				);
		}
		catch(e) {
		}

		return {
			snapshotLength : 0,
			snapshotItem : function() {
				return null;
			},
			singleNodeValue : null,
			iterateNext : function() {
				return null;
			}
		};
	}
 
}; 
  
window.addEventListener('load', RubyService, false); 
window.addEventListener('load', RubyService, false);
 
