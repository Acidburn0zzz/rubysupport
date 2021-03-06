**Important note**:
This project was completely obsolete because HTML5 Ruby is now available by default on Firefox 38 and later.
XHTML Ruby was dead, it was ignored by all browser vendors...

========================================================================
          XHTMLルビサポート for Netscape 7 & Mozilla & Firefox
========================================================================
[名称       ] XHTMLルビサポート for Netscape 7 & Mozilla & Firefox
[バージョン ] 1.4.2006100801
[種別       ] フリーソフトウェア
[制作者     ] Piro(下田 洋志)
[最終更新   ] 2006/10/8
[圧縮形式   ] LHA
[動作環境   ] Netscape 7.0 以上あるいはMozilla 1.0 以上が動作する環境。
              当方ではWindows 2000上で、Mozilla Firefox 2.0 RC2 にて動作
              の確認を行っています。

[転載/再配布] 無断転載・再配布は自由に行っていただいて構いません。改造し
              たものを公開することも制限しません。ただしクレジットは元の
              ものを残すようにしてください。
              このパッケージに含まれるコードの殆どは MPL 1.1, GPL 2.0,
              および LGPL 2.1 のトリプルライセンスとなっていますので、
              これらの点については、それぞれのライセンスの条件に従って下
              さい。
              なお、書籍の付録CD-ROMやソフトウェア等へ収録していただける
              場合は、必ず事前にご連絡下さい。

[著作権     ] このパッケージに含まれるプログラムの著作権はPiro(下田 洋
              志)が保有します。多分。
              ていうかプログラムに著作権って認められるんだっけ？ しかも
              UIはXMLだし。文書インスタンスのマークアップに著作権は発生
              しないというのが公の見解だったような気も……

[連絡先     ] piro.outsider.reflex@gmail.com
[配布元     ] http://piro.sakura.ne.jp/
              http://hp.vector.co.jp/authors/VA016061/


========================================================================
＊目次

  ・ヘッダ
  ・目次
  ・ファイル構成
  ・紹介
  ・インストール手順
  ・アンインストール手順
  ・謝辞
  ・免責
  ・更新履歴（抜粋）


========================================================================
＊ファイル構成

  ・readme.txt     : 取扱説明(このファイル)
  ・rubysupport.xpi: XPInstall Package本体

 ※どちらも、インストール後は削除してかまいません。


========================================================================
＊紹介

Moz/NS7 でXHTMLのルビを表示できるようにする拡張機能です。単純ルビ・複雑
ルビの両方に対応しています。また、略語のフルスペル情報が title 属性で与
えられている場合、それをルビとして表示できます。

Advanced （詳細）の中に加わる設定パネルでは、ルビ表示の有効無効、略語を
ルビ表示する場合の細かい設定を変更できます。


========================================================================
＊インストール手順

  +-----------------------------------------------------------------+
  | ※旧バージョンからの更新の場合、インストールを始める前に、必    |
  |   ず、次項の「アンインストール手順」に従って旧バージョンをア    |
  |   ンインストールしておいて下さい。旧バージョンのファイルが残っ  |
  |   ている場合、導入に失敗したり、NS/Mozの動作に支障が出る場合    |
  |   があります。                                                  |
  | ※インストールを行う前に、Preferences（設定） >                 |
  |   Advanced（詳細） > Software Installation（ソフトウェアのイ    |
  |   ンストール）で「Enable software installation（ソフトウェア    |
  |   のインストールを可能にする）」にチェックを入れて下さい。      |
  | ※Mozilla 1.3以前では、管理者権限でないとインストールできませ   |
  |   ん。導入は必ず、rootあるいはadminでログオンして行って下さい。 |
  +-----------------------------------------------------------------+

step1: ファイルのコピー
  rubysupport.xpiをブラウザのウィンドウにドロップすると、インストール
  が開始されます。
  途中、日本語の言語パックを登録するかどうかの確認があるので、必要に応じ
  て選択して下さい。

step2: NS/Mozの再起動
  ファイルのコピーが終わったら、NS/Mozを再起動します。
  コピーしたファイル群が、起動時にNS/Mozに登録されます。


========================================================================
＊アンインストールの手順

Preferences（設定） > Advanced（詳細） > XHTML Ruby Support（XHTMLルビ
サポート）で「Uninstall（アンインストール）」と書かれたボタンをクリック
すると、自動でアンインストールが行われます。

なお、ファイルの削除は自動では行われません。表示されるメッセージに従っ
て、ブラウザを終了させた後に、指定されたファイルを手動で削除して下さい。


ブラウザ自体起動できないなどの緊急の場合には、以下の手順に従って、手動
でアンインストールを行って下さい。

  1. NS/Moz を終了させる。簡易起動（高速起動）が有効になっている場合、
     タスクトレイのアイコンを右クリックして、そちらも終了させる。
  2. ユーザープロファイルディレクトリか、 NS/Moz をインストールした
     ディレクトリ（管理者権限でインストールした場合）の中にある
     /chrome/ フォルダから、 rubysupport.jar, overlayinfo ディレクトリ,
     chrome.rdf を削除する。
  3. 管理者権限でインストールした場合、installed-chrome.txt をメモ帳等
     で開き、以下の行を削除する。
     ・content,install,url,jar:resource:/chrome/rubysupport.jar!
                           /content/rubysupport/
     ・locale,install,url,jar:resource:/chrome/rubysupport.jar!
                           /locale/en-US/rubysupport/
    (・locale,install,url,jar:resource:/chrome/rubysupport.jar!
                           /locale/ja-JP/rubysupport/)

この手順では設定情報などが残ったままになりますが、ブラウザを使用する上
では問題ありません。


========================================================================
＊謝辞

このパッケージを公開するにあたり、ルビ表示のスタイルシートを考案された
北村曉氏（http://www.akatsukinishisu.net/）に深く感謝いたします。


========================================================================
＊免責

このパッケージを使用した事により発生したいかなる障害に対しても、制作者
は一切の責任を持ちません。全て使用者の個人の責任に基づくものとします。


========================================================================
＊更新履歴（抜粋）

1.4.2006100801
    ・略語のフルスペルをルビ表示する機能を無効にしていると、ルビ
      が指定された部分の楯の表示位置が補正されない問題を修正
1.4.2005110501
    ・略語のフルスペルをルビ表示する機能が働かなくなっていたの
      を修正
    ・Forefox用の設定画面でアンインストール用のボタンが表示され
      ていたのを修正
1.4.20050828
    ・ルビが指定された部分の縦の表示位置を補正する処理を改善
      （by Takeshi Nishimura）
1.4.20050713
    ・Deer Park Alpha2で動作しない問題を修正
1.4.20050604
    ・IE用のルビを解釈するアルゴリズムを修正
    ・内部処理にXPathを活用するようにした
1.3.20050422
    ・IE用のルビを解釈するアルゴリズムを修正
1.3.20050420
    ・ルビベースが消失してしまう問題を修正
    ・内部処理を少し修正
1.3.20050419
    ・ルビテキストがルビベースにめり込んでいたのを改善
    ・ルビを指定した語の表示位置のズレの補正アルゴリズムを改善
1.3.20050227
    ・IE用のルビを解釈するアルゴリズムを改善
    ・IE用のルビを解釈する処理でエラーが起こっていたのを修正
1.3.20050224
    ・IE用のルビを解釈するアルゴリズムを改善
1.3.20050218
    ・IE用のルビを解釈するアルゴリズムを改善
1.3.20050121
    ・IE用のルビを解釈するアルゴリズムを改善
1.3.20050115
    ・IE用のルビを解釈するアルゴリズムを改善（by Takeshi Nishimura）
    ・フレーム内のページのルビが表示されない問題を修正（by Takeshi
      Nishimura）
    ・rbspanが指定された複雑ルビを正しく表示できない問題を修正（by
      Takeshi Nishimura）
    ・略語をルビで表示する設定の時、最初に登場する要素ではなく最後に
      登場する要素が展開されてしまっていたのを修正
1.3.20040818
    ・Firefoxの設定ダイアログがフリーズする可能性があったのを修正
1.3.20040523
    ・Firefoxで設定ダイアログを使えるようにした
1.3.20030612
    ・最新のMozillaで正常に動作しない問題を修正
1.3.20030413
    ・プロファイルディレクトリのoverlays.rdfにゴミを残さないようにした
      （ユーザー別にインストールした後でアンインストールし管理者権限で
        再インストールした場合に動作しない問題の対処）
1.3.20030405
    ・ルビテキストをポップアップできなくなっていたのを修正
    ・アンインストーラのミスを修正
1.3.20021222
    ・ページにルビが含まれていないときはスタイルシートを加えないようにし
      た
    ・処理に失敗していたのを修正
1.3.20021127
    ・最近のMozillaで新規タブを開く時にエラーになる問題を修正
1.3.20021120
    ・エラーで処理が停止していたのを修正
1.3.20021119
    ・getBrowser()を使わないようにした
    ・要素の内部テキストを得る処理を修正
1.3.20021004
    ・PhoenixのThemes and Extensionsパネルで有効無効を設定できるようにし
      た
1.3.20021003
    ・Phoenixへの対応をぼつぼつ開始
1.3.20020930
    ・Mozilla 1.2 以降においてtext/htmlのページでルビが使われている場合
      にクラッシュする問題を修正
1.3.20020928
    ・ノードリストの連結に失敗する問題を修正
    ・Arrayのconcatでノードリストを扱わないようにした
1.3.20020925
    ・自己アンインストール機能が働かない問題を修正
    ・省略されたマークアップの補完（DOMノードツリーの修復）を、
      QuirksModeあるいはXHTML以外のHTMLの場合に行うようにした
1.3.20020923
    ・XBLを使わずに処理するようにした
    ・要素の表示位置のずれを常に補正するようにした
1.2.20020918
    ・自己アンインストール機能がMozilla1.2a以降で働かない問題を修正
1.2.20020912
    ・単体で動作できないようになっていた問題を修正
    ・IE用の複数のルビテキストに対応
    ・要素の表示位置のずれを補正する機能が働かない場合があったのを修正
1.2.20020907
    ・ルビをふった要素の表示位置のずれを、XBLを用いて自動で補正できるよ
      うにした（※若干不安定になります）
1.1.20020830
    ・NS6用のコードを除去
    ・複雑ルビの表示が正しく行われていなかったのを修正
    ・ルビ文字列をツールチップで表示するようにした
    ・自己アンインストール機能を追加
1.0.20020821
    ・IE向けのルビマークアップをXHTMLルビに補完する機能が働いていなかっ
      たのを修正
1.0.20020628
    ・Mozilla 1.0 以降では"@mozilla.org/rdf/datasource;1?name=window-
      mediator"の代わりに"@mozilla.org/appshell/window-mediator;1"を使う
      ようにした
1.0.20020619
    ・コードを整理
1.0.20020531
    ・余計なコードが混入していたのを修正
1.0.20020528
    ・コンテキストメニュー拡張と機能衝突を起こす問題を修正
1.0.20020527
    ・コンテキストメニュー拡張からパッケージを分離
    ・設定の表記などを少し変更


------------------------------------------------------------------------
XHTML Ruby Support for NS7 & Moz & Firefox
Copyright 2002-2005 Piro(YUKI "Piro" Hiroshi)
