function RubyServiceStartup() 
{
	if (RubyService.initialized) return;
	RubyService.initialized = true;

try {
	if (nsPreferences.getBoolPref('rubysupport.general.enabled') === null)
		nsPreferences.setBoolPref('rubysupport.general.enabled', true);

	if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.enabled') === null)
		nsPreferences.setBoolPref('rubysupport.abbrToRuby.enabled', false);

	if (nsPreferences.getIntPref('rubysupport.abbrToRuby.mode') === null)
		nsPreferences.setIntPref('rubysupport.abbrToRuby.mode', 1);

	if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.noPseuds') === null)
		nsPreferences.setBoolPref('rubysupport.abbrToRuby.noPseuds', true);


	if (RubyService.SSS) {
		RubyService.useGlobalStyleSheets = true;
		RubyService.updateGlobalStyleSheets();
	}

	RubyService.overrideFunctions();

}
catch(e) {
dump('CAUTION: XHTML Ruby Support fails to initialize!\n  Error: '+e+'\n');
}
//	window.removeEventListener('load', RubyServiceStartup, false);
//	window.removeEventListener('load', RubyServiceStartup, false);
}
 
window.addEventListener('load', RubyServiceStartup, false); 
window.addEventListener('load', RubyServiceStartup, false);
 
var RubyService = 
{
	initialized : false,

	useGlobalStyleSheets : false,

	XHTMLNS : 'http://www.w3.org/1999/xhtml',
	RUBYNS  : 'http://piro.sakura.ne.jp/rubysupport',

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
 
	getRubyBase : function(aNode) 
	{
		var bases = this.getNodesFromXPath('child::*[contains(" rb rbc RB RBC ", concat(" ", local-name(), " "))]', aNode);
		if (bases.snapshotLength)
			return bases.snapshotItem(0);

		var nodeWrapper = new XPCNativeWrapper(aNode, 'childNodes', 'getElementsByTagName()');
		return nodeWrapper.getElementsByTagName('*')[0];
	},
 
	parseRubyNodes : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document');
		if (!winWrapper.document) return 0;

if (!aWindow.rubyStart) aWindow.rubyStart = (new Date()).getTime();


		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement');
		var count = 0;

		var ruby = this.getNodesFromXPath('/descendant::*[contains(" ruby RUBY ", concat(" ", local-name(), " ")) and not(@moz-ruby-parsed)]', docWrapper.documentElement);
		for (var i = ruby.snapshotLength-1; i > -1; i--)
		{
			try {
				this.parseRuby(ruby.snapshotItem(i));
			}
			catch(e) {
//				dump(e+'\n > '+ruby.snapshotItem(i)+'\n');
			}
		}

		count += this.getNodesFromXPath('/descendant::*[contains(" ruby RUBY ", concat(" ", local-name(), " "))]', docWrapper.documentElement).snapshotLength;

		if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.enabled')) {
			var abbr = this.getNodesFromXPath(
						'/descendant::*[contains(" abbr ABBR ", concat(" ", local-name(), " ")) and @title and not(@title = "") and not(@moz-ruby-parsed)]',
						docWrapper.documentElement,
						XPathResult.ORDERED_NODE_ITERATOR_TYPE
					);
			var abbrNode;
			while (abbrNode = abbr.iterateNext())
			{
				try {
					var nodeWrapper = new XPCNativeWrapper(abbrNode, 'setAttribute()');
					nodeWrapper.setAttribute('moz-ruby-parsed', 'progress');
					this.parseAbbr(abbrNode);
					nodeWrapper.setAttribute('moz-ruby-parsed', 'done');
				}
				catch(e) {
	//				dump(e+'\n > '+abbr[i]+'\n');
				}
			}

			count += this.getNodesFromXPath('/descendant::*[contains(" abbr ABBR ", concat(" ", local-name(), " ")) and @title and not(@title = "")]', docWrapper.documentElement).snapshotLength;
		}

		window.setTimeout(RubyService.correctVerticalPositionsIn, 0, aWindow);

dump('ruby parsing: '+((new Date()).getTime()-aWindow.rubyStart) +'msec\n');
		return count;
	},
 
	correctVerticalPositionsIn : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document');
		if (!winWrapper.document) return;

		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement');

		var ruby = RubyService.getNodesFromXPath('/descendant::*[contains(" ruby RUBY ", concat(" ", local-name(), " ")) and @moz-ruby-parsed = "done"]', docWrapper.documentElement);
		for (var i = ruby.snapshotLength-1; i > -1; i--)
			RubyService.correctVerticalPosition(ruby.snapshotItem(i));
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
		if (nodeWrapper.hasAttribute('moz-ruby-vertical-position-corrected'))
			return done;


		var d = nodeWrapper.ownerDocument;
		var docWrapper = new XPCNativeWrapper(nodeWrapper.ownerDocument,
				'getAnonymousNodes()',
				'getBoxObjectFor()'
			);

		if (String(nodeWrapper.localName).toLowerCase() != 'ruby') {
			node = docWrapper.getAnonymousNodes(node);
			if (node && node.length)
				node = node[0];
			else
				return done;

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

			var base = RubyService.getRubyBase(node);
			if (!base) return done; // if we get box object for "undefined", Mozilla makes crash.
			var rbBox = base.cellBoxObject || docWrapper.getBoxObjectFor(base);
			if (!rbBox) return done;


			// �O��ɉ��̃{�b�N�X��}�����A�����␳�̊�ɂ���
			var beforeBoxNode = document.createElementNS(RubyService.RUBYNS, 'dummyBox');
			beforeBoxNode.appendChild(document.createTextNode('['));
			var afterBoxNode  = document.createElementNS(RubyService.RUBYNS, 'dummyBox');
			afterBoxNode.appendChild(document.createTextNode(']'));

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

//dump('RUBY VERTICAL POSITION::\nBOX Y: '+rbBox.y+'\nBOX HEIGHT: '+rbBox.height+'\nBASE Y: '+baseBox.y+'\nBASE HEIGHT: '+baseBox.height+'\n');

			var offset = (rbBox.y+rbBox.height) - (baseBox.y+baseBox.height);// + 1;
			if (offset != 0) {
				nodeWrapper.setAttribute('style', 'vertical-align: '+offset+'px !important;');
				nodeWrapper.setAttribute('moz-ruby-vertical-position-corrected', true);
				done = true;
			}

			parentWrapper.removeChild(beforeBoxNode);
			parentWrapper.removeChild(afterBoxNode);
		}
		catch(e) {
//alert(e+'\n');
		}

		return done;
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
				'doctype'
			);

		nodeWrapper.setAttribute('moz-ruby-parsed', 'progress');


		// ����݊����[�h���邢�͔�XHTML�̏ꍇ�ł̂݃^�O�̕⊮���s��
		if (docWrapper.compatMode == 'BackCompat' ||
			docWrapper.contentType == 'text/html' ||
			!/XHTML/.test(docWrapper.doctype.publicId))
			this.fixUpMSIERuby(aNode);


		// rbspan�t����rt��td�ŕ��
		// �}�[�N�A�b�v��j�󂷂�̂ŋX�����Ȃ����ǁA�ǂ������o�n�u���E�U�����c�c�i����
		var rtcs = this.getNodesFromXPath('descendant::*[contains(" rtc RTC ", concat(" ", local-name(), " "))]', aNode);
		if (rtcs.snapshotLength) {
			var rts = this.getNodesFromXPath('descendant::*[contains(" rt RT ", concat(" ", local-name(), " ")) and @rbspan and not((@rbspan = "") or (number(@rbspan) < 2) or parent::xhtml:td)]', aNode);

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

				tmp_td = document.createElementNS(RubyService.XHTMLNS, 'td');
				tmp_td.setAttribute('moz-ruby-inserted', true);
				tmp_td.setAttribute('colspan', rtWrapper.getAttribute('rbspan'));
				// �ȉ���2�s�́A��s�ɂ܂Ƃ߂ď������Ƃ���Ɖ��̂��G���[�ɂȂ�
				tmp_td_content = parentWrapper.replaceChild(tmp_td, rts.snapshotItem(i));
				tmp_td.appendChild(tmp_td_content);
			}
		}

		nodeWrapper.setAttribute('moz-ruby-parsed', 'done');
	},
	
	// IE�p�̃}�[�N�A�b�v��XHTML�̎d�l�ɏ����������̂ɏC�� 
	fixUpMSIERuby : function(aNode)
	{
try{
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
				'createElementNS()'
			);

		/*
			���G���r���g�p����Ă���ꍇ�A���̏����͍s��Ȃ��B
			�iXHTML�ł͏I���^�O�͏ȗ����꓾�Ȃ��̂Łj
		*/
		var rbcs = this.getNodesFromXPath('descendant::*[contains(" rbc RBC ", concat(" ", local-name(), " "))]', aNode);
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
				notClosedRubyElements = this.getNodesFromXPath(
					'child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))][child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))]]',
					aNode
				)
			).snapshotLength
			)
		{
			childRubyElement = this.getNodesFromXPath(
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
		var rts = this.getNodesFromXPath('child::*[contains(" rt RT ", concat(" ", local-name(), " "))]', aNode);
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

			containerRubyBase = document.createElementNS(RubyService.RUBYNS, 'rb');
			containerRubyBase.appendChild(range.extractContents());
			range.insertNode(containerRubyBase);

			// �V������������rb�̒��ɂ��ׂĂ܂Ƃ߂ĂԂ�����ł��邽�߁A
			// <ruby>hoge<rb></rb><rt>foobar</rt></ruby> �̂悤�ȃ}�[�N�A�b�v��
			// <ruby><RB>hoge<rb></rb></RB><rt>foobar</rt></ruby> �Ƃ������ɂȂ��Ă��܂��Ă���B
			// �Ȃ̂ŁA�����œ���q�ɂȂ���rb���폜���Ă����B
			rangeContents = this.getNodesFromXPath('child::*[contains(" rb RB ", concat(" ", local-name(), " "))]', containerRubyBase);
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
		var nextStart = this.getNodesFromXPath(
			'(child::*[contains(" rb RB ", concat(" ", local-name(), " "))][2] | child::*[contains(" rb RB rt RT rp RP ", concat(" ", local-name(), " "))][last()]/following-sibling::node()[1])',
			aNode
		);
		if (nextStart.snapshotLength) {
			var shouldCreateNewRubyElement = this.getNodesFromXPath('child::*[contains(" rb RB ", concat(" ", local-name(), " "))][2]', aNode).snapshotLength > 0;

			range.selectNodeContents(aNode);
			range.setStartBefore(nextStart.snapshotItem(0));
			movedContents = range.extractContents();

			if (shouldCreateNewRubyElement) {
				var newRubyElement = docWrapper.createElementNS(RubyService.RUBYNS, 'ruby');
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
		var rts = this.getNodesFromXPath('child::*[contains(" rt RT ", concat(" ", local-name(), " "))]', aNode);
		if (rts.snapshotLength > 1) {
			var text = document.createElementNS(RubyService.RUBYNS, 'rtc-ie');
			nodeWrapper.insertBefore(text, rts.snapshotItem(0));

			for (i = rts.snapshotLength-1; i > -1; i--)
				text.insertBefore(nodeWrapper.removeChild(rts.snapshotItem(i)), text.firstChild);
		}
}catch(e){dump(e+'\n');}
	},
  
	parseAbbr : function(aNode) 
	{
		var nodeWrapper = new XPCNativeWrapper(aNode,
				'title',
				'ownerDocument',
				'setAttribute()'
			);

		var mode = nsPreferences.getIntPref('rubysupport.abbrToRuby.mode', 0);

		// ���ɓW�J��������͂����W�J���Ȃ�
		var basetext = aNode.textContent;
		var info = RubyService.getDocInfo((new XPCNativeWrapper(nodeWrapper.ownerDocument, 'defaultView')).defaultView);

		if (!info.fullspell) info.fullspell = {};

		if (!info.fullspell[basetext+'::'+nodeWrapper.title] || !mode) {
			nodeWrapper.setAttribute('rubytext', nodeWrapper.title);
			info.fullspell[basetext+'::'+nodeWrapper.title] = true;

			if (!this.correctVerticalPosition(aNode))
				window.setTimeout(this.correctVerticalPosition, 0, aNode); // fallback
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
			!RubyService.getNodesFromXPath('descendant-or-self::*[@title and not(@title = "")]', target).snapshotLength
			) {
			var rtc = RubyService.getNodesFromXPath('descendant::*[contains(" rtc RTC ", concat(" ", local-name(), " "))]', target);
			if (rtc.snapshotLength) {
				popuptext = rtc.snapshotItem(0).textContent;
				if (rtc.snapshotLength > 1)
					popuptext += ' / '+rtc.snapshotItem(1).textContent;
			}
			else {
				var rt = RubyService.getNodesFromXPath('descendant::*[contains(" rt RT ", concat(" ", local-name(), " "))]', target);
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

		var w = aWebProgress.DOMWindow;
		var rubyLength = RubyService.parseRubyNodes(w);



		const PL = Components.interfaces.nsIWebProgressListener;

		// Apply Stylesheet (legacy operation, for old Mozilla)
		if (
			!RubyService.useGlobalStyleSheets &&
			(aStateFlags & PL.STATE_IS_DOCUMENT ||
			aStateFlags & PL.STATE_IS_WINDOW) &&
			(!('rubyStyleEnabled' in w) || !w.rubyStyleEnabled)
			) {
			if (rubyLength) RubyService.setRubyStyle(w);
			w.rubyStyleEnabled = true;
		}

		var winWrapper = new XPCNativeWrapper(w, 'frames');
		var count = winWrapper.frames.length;
		for (var i = 0; i < count; i++) {
			rubyLength = RubyService.parseRubyNodes(winWrapper.frames[i]);

			// Apply Stylesheet (legacy operation, for old Mozilla)
			if (
				!RubyService.useGlobalStyleSheets &&
				(
					aStateFlags & PL.STATE_IS_DOCUMENT ||
					aStateFlags & PL.STATE_IS_WINDOW
				) &&
				!winWrapper.frames[i].rubyStyleEnabled
				) {
				if (rubyLength) RubyService.setRubyStyle(winWrapper.frames[i]);
				winWrapper.frames[i].rubyStyleEnabled = true;
			}
		}
	},
	
	// ���r�\���̃X�^�C����ǉ� 
	setRubyStyle : function(targetWindow)
	{
		var info = this.getDocInfo(targetWindow);

		if (!nsPreferences.getBoolPref('rubysupport.general.enabled') ||
			info.ruby_styleDone) return;

		// ���r�p�̃X�^�C���V�[�g��ǉ�����
		this.addStyleSheet('chrome://rubysupport/content/styles/ruby.css', targetWindow);

		if (nsPreferences.getBoolPref('rubysupport.abbrToRuby.noPseuds'))
			this.addStyleSheet('chrome://rubysupport/content/styles/ruby-abbr-nopseuds.css', targetWindow);

		info.ruby_styleDone = true;
	},
	
	getDocInfo : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document');

		if (!('__mozInfo__' in winWrapper.document) ||
			!winWrapper.document.__mozInfo__) {
			winWrapper.document.__mozInfo__ = {};
		}

		return winWrapper.document.__mozInfo__;
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
    
	getNodesFromXPath : function(aXPath, aContextNode, aType) 
	{
		// http://www.hawk.34sp.com/stdpls/xml/
		// http://www.hawk.34sp.com/stdpls/xml/dom_xpath.html
		// http://www.homoon.jp/users/www/doc/CR-css3-selectors-20011113.shtml
		const xmlDoc  = aContextNode ? aContextNode.ownerDocument : document ;
		const context = aContextNode || xmlDoc.documentElement;
		const type    = aType || XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
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


		var resultObj = (type == XPathResult.ORDERED_NODE_ITERATOR_TYPE ||
						type == XPathResult.UNORDERED_NODE_ITERATOR_TYPE) ?
				{
					count       : 0,
					iterateNext : function()
					{
						try {
							return this.XPathResult.iterateNext();
						}
						catch(e) {
							return null;
						}
					}
				} :
				{
					get length() {
						return this.snapshotLength;
					},
					get snapshotLength() {
						return this.XPathResult.snapshotLength;
					},

					item : function(aIndex)
					{
						return this.snapshotItem(aIndex);
					},
					snapshotItem : function(aIndex)
					{
						return this.XPathResult.snapshotItem(aIndex);
					}
				};

		try {
			var expression = xmlDoc.createExpression(aXPath, resolver);
			var result     = expression.evaluate(context, type, null);
		}
		catch(e) {
			dump('=============getNodesFromXPath===========\n');
			dump('============____ERROR____============\n');
			dump('XPath   : '+aXPath+'\n');
			if (aContextNode)
				dump('Context : '+aContextNode+'('+aContextNode.localName+')\n');
			dump(e+'\n');
			dump('============~~~~ERROR~~~~============\n');

			resultObj.XPathResult = {
				snapshotLength : 0,
				snapshotItem : function()
				{
					return null;
				},
				iterateNext : function()
				{
					return null;
				}
			};
			return resultObj;
		}

		resultObj.XPathResult = result;
		return resultObj;
	}
 
}; 
  
