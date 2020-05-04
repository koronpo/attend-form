// Compiled using ts2gas 3.6.1 (TypeScript 3.8.3)
// 定数
var CONFIG_SHEET = '基本設定'; // 授業一覧開始セル行
var EXC_ROW = 4; // 無視シート開始セル行
var EXC_COL = 1; // 無視シート開始セル列
var SN_SAYING = '名言'; // 授業一覧開始セル行
var CLA_START_T_ROW = 4; // 授業開始時刻のセル行
var CLA_START_T_COL = 2; // 授業開始時刻のセル列
var CLA_END_T_ROW = 5; // 授業終了時刻のセル行
var CLA_END_T_COL = 2; // 授業終了時刻のセル列
var CLA_STU_LIST_ROW_STA = 9; // 授業参加生徒の開始セル行
var CLA_STU_LIST_COL_STA = 1; // 授業参加生徒の開始セル列
var CLA_STU_LIST_COL_END = 2; // 授業開始時刻の終了セル列
var CLA_PSS_ROW = 6; // 授業パスワードのセル行
var CLA_PSS_COL = 2; // 授業パスワードのセル列
var WRITE_RESULT_SUCCESS = 's'; // 書き込み処理成功
var WRITE_RESULT_P_ERROR = 'p'; // 書き込み処理パスワード不一致
var WRITE_RESULT_DUPLICATE_SN = 'sn'; // 学籍番号重複
var WRITE_RESULT_DUPLICATE_KEY = 'key'; // ユーザー key 重複
var ANS_ROW = 8; // 出席回答の開始セル行
var ANS_COL = 4; // 出席回答の開始セル列
var SAYYING_FLG = 'する'; // 格言フラグ値
var SAYYING_FLG_ROW = 5; // 格言フラグ行
var SAYYING_FLG_COL = 3; // 格言フラグカラム
var SAYYING_LIST_ROW = 2; // 格言開始行
var SAYYING_LIST_COL = 3; // 格言終了カラム
var PASS_FLG = 'する'; // パスワードフラグ値
var PASS_FLG_ROW = 8; // パスワード日時生成フラグ行
var PASS_FLG_COL = 3; // パスワード日時生成フラグカラム
var PASS_LENGTH_ROW = 11; // パスワード長さ値行
var PASS_LENGTH_COL = 3; // パスワード長さ値カラム
var PASS_ROW = 6; // 授業シート内のパスワード行
var PASS_COL = 2; // 授業シート内のパスワードカラム
var PASS_STRINGS = "abcdefghijklmnopqrstuvwxyz0123456789"; // パスワード生成に使用する文字列
var LATE_ROW = 14; // 遅刻許容行
var LATE_COL = 3; // 遅刻許容カラム
// GAS
function doGet() {
    var htmlOutput = HtmlService.createTemplateFromFile("index").evaluate();
    htmlOutput
        .setTitle('出席管理')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return htmlOutput;
}
// シート名一覧を取得
function getSheetNames() {
    var allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    var sheetNames = [];
    if (allSheets.length >= 1) {
        for (var i = 0; i < allSheets.length; i++) {
            sheetNames.push(allSheets[i].getName());
        }
    }
    return sheetNames;
}
// 除外対象のシート名一覧を取得
function getExcSheetNames() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
    // 対象行の最終行番号を取得
    var lastRow = sheet
        .getRange(EXC_ROW, EXC_COL)
        .getNextDataCell(SpreadsheetApp.Direction.DOWN)
        .getRow();
    var acquisitionRow = lastRow - EXC_ROW + 1;
    // 行データ取得
    var rows = sheet.getRange(EXC_ROW, EXC_COL, acquisitionRow).getValues();
    rows = adjustArray(rows);
    // 除外授業のカラム名取得
    var colName = sheet.getRange(EXC_ROW, EXC_COL).getValue();
    // 返却用の配列作成
    var ret = [];
    for (var i = 0; i < rows.length; i++) {
        ret.push(rows[i][colName]);
    }
    // 行データの2次元配列
    return ret;
}
// 対象授業名取得
function getBaseData() {
    var ret = {
        docName: '',
        classList: null
    };
    var targetClass = getSheetNames();
    var excClass = getExcSheetNames();
    ret.classList = targetClass.filter(function (item) {
        return excClass.indexOf(item) == -1;
    });
    ret.docName = SpreadsheetApp.getActiveSpreadsheet().getName();
    return ret;
}
// 授業詳細を取得
function getClassDetail(className) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(className);
    var retObj = {
        startTime: '',
        endTime: '',
        stList: null
    };
    // 開始終了時刻
    retObj.startTime = sheet
        .getRange(CLA_START_T_ROW, CLA_START_T_COL)
        .getDisplayValue();
    retObj.endTime = sheet
        .getRange(CLA_END_T_ROW, CLA_END_T_COL)
        .getDisplayValue();
    // 生徒一覧の最終行を取得
    var lastRow = sheet
        .getRange(CLA_STU_LIST_ROW_STA, CLA_STU_LIST_COL_STA)
        .getNextDataCell(SpreadsheetApp.Direction.DOWN)
        .getRow();
    // 第三引数は第一引数を含めた行から何行取得するかの指定
    // 第三引数は第一引数を含めた列から何列取得するかの指定
    var targetRow = lastRow - CLA_STU_LIST_ROW_STA + 1;
    var rows = sheet
        .getRange(CLA_STU_LIST_ROW_STA, 1, targetRow, CLA_STU_LIST_COL_END)
        .getValues();
    // 行データの2次元配列
    retObj.stList = adjustArray(rows);
    return retObj;
}
// データ書き込み処理
function writeData(formData) {
    // 現在時刻と日付
    var now = new Date();
    var nowDate = Utilities.formatDate(now, 'JST', 'yyyy/MM/dd');
    var nowTime = Utilities.formatDate(now, 'JST', 'HH:mm:ss');
    var ret = {
        retType: '',
        sayingDetal: '',
        sayingUser: '',
        sayingUserInfo: ''
    };
    ret.retType = WRITE_RESULT_SUCCESS;
    // 授業詳細シート取得
    var sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(formData.className);
    // 授業パスワード取得
    var classPass = sheet
        .getRange(CLA_PSS_ROW, CLA_PSS_COL)
        .getDisplayValue();
    // 授業パスワード比較
    if (classPass !== formData.classPass) {
        ret.retType = WRITE_RESULT_P_ERROR;
        return ret;
    }
    // 出席データの最終行を取得
    var lastRow = sheet
        .getRange(ANS_ROW, ANS_COL)
        .getNextDataCell(SpreadsheetApp.Direction.DOWN)
        .getRow();
    // 回答重複チェック
    var checkResult = checkDuplicateAns(formData, sheet, lastRow, nowDate);
    if (checkResult !== '') {
        ret.retType = checkResult;
        return ret;
    }
    // 授業基本シート取得
    var baseSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
    // 遅刻判定
    var isLate = false;
    var lateMinute = baseSheet.getRange(LATE_ROW, LATE_COL).getValue();
    var startTime = sheet
        .getRange(CLA_START_T_ROW, CLA_START_T_COL)
        .getDisplayValue();
    if (lateMinute !== '' && isFinite(lateMinute)) {
        isLate = this.checkLate(now, startTime, lateMinute);
    }
    var saying = this.getSaying();
    if (getSayingFlg(baseSheet) === SAYYING_FLG && saying.sayingDetal !== '') {
        ret.sayingDetal = saying.sayingDetal;
        ret.sayingUser = saying.sayingUser;
        ret.sayingUserInfo = saying.sayingUserInfo;
    }
    // データ入力
    var writeRow = lastRow + 1;
    // 学籍番号
    sheet.getRange(writeRow, ANS_COL).setValue(formData.stNo);
    // 氏名
    sheet.getRange(writeRow, ANS_COL + 1).setValue(formData.stName);
    // 日付
    sheet.getRange(writeRow, ANS_COL + 2).setValue(nowDate);
    // 時刻
    sheet.getRange(writeRow, ANS_COL + 3).setValue(nowTime);
    // uniqueKey
    sheet.getRange(writeRow, ANS_COL + 4).setValue(getUserKey());
    // 遅刻
    if (isLate) {
        sheet.getRange(writeRow, ANS_COL + 5).setValue('遅刻');
    }
    else {
        sheet.getRange(writeRow, ANS_COL + 5).setValue('-');
    }
    return ret;
}
// 回答同一日付重複チェック
function checkDuplicateAns(formData, sheet, lastRow, nowDate) {
    var ret = '';
    if (lastRow === ANS_ROW + 1) {
        // データ無しとなるので何もしない
        return ret;
    }
    var targetRow = lastRow - ANS_ROW + 1;
    // 対象回答を取得する
    // ANS_ROW + 1 となっているのは対象タイトルヘッダを指定している為
    var rows = sheet
        .getRange(ANS_ROW + 1, ANS_COL, targetRow, 5)
        .getValues();
    var ansArray = adjustArray(rows);
    var filterAnsArray;
    // ユーザー key 重複チェック
    var userKey = this.getUserKey();
    filterAnsArray = ansArray.filter(function (item) {
        var itemDate = Utilities.formatDate(new Date(item['日付']), 'JST', 'yyyy/MM/dd');
        if (item['uniqueKey'] === userKey
            && itemDate === nowDate)
            return true;
    });
    if (filterAnsArray.length > 0) {
        return WRITE_RESULT_DUPLICATE_KEY;
    }
    // 学生番号重複チェック
    filterAnsArray = ansArray.filter(function (item) {
        var itemDate = Utilities.formatDate(new Date(item['日付']), 'JST', 'yyyy/MM/dd');
        if (item['学籍番号'] === formData.stNo
            && itemDate === nowDate)
            return true;
    });
    if (filterAnsArray.length > 0) {
        return WRITE_RESULT_DUPLICATE_SN;
    }
    return ret;
}
// 格言フラグ値も取得
function getSayingFlg(sheet) {
    var isSaying = sheet.getRange(SAYYING_FLG_ROW, SAYYING_FLG_COL).getValue();
    return isSaying;
}
// 格言
function getSaying() {
    var ret = {
        sayingDetal: '',
        sayingUser: '',
        sayingUserInfo: ''
    };
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SN_SAYING);
    // 生徒一覧の最終行を取得
    var lastRow = sheet
        .getRange(1, 1)
        .getNextDataCell(SpreadsheetApp.Direction.DOWN)
        .getRow();
    var targetRow = lastRow - SAYYING_LIST_ROW;
    if (targetRow === 0) {
        return ret;
    }
    var rows = sheet
        .getRange(SAYYING_LIST_ROW, 1, targetRow + 1, SAYYING_LIST_COL)
        .getValues();
    var getArray = this.adjustArray(rows);
    var targetArryaNo = Math.floor(Math.random() * (getArray.length));
    ret.sayingDetal = getArray[targetArryaNo]['名言'];
    ret.sayingUser = getArray[targetArryaNo]['人物'];
    ret.sayingUserInfo = getArray[targetArryaNo]['人物情報'];
    return ret;
}
// 配列調整
function adjustArray(_array) {
    var ret;
    var keys = _array.splice(0, 1)[0];
    ret = _array.map(function (row) {
        var obj = {};
        row.map(function (item, index) {
            obj[String(keys[index])] = String(item);
        });
        return obj;
    });
    return ret;
}
// 日時バッチ
function execDaylyBatch() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
    var passFlg = sheet.getRange(PASS_FLG_ROW, PASS_FLG_COL).getValue();
    // パスワード生成処理
    if (passFlg === PASS_FLG) {
        var passLength = sheet.getRange(PASS_LENGTH_ROW, PASS_LENGTH_COL).getValue();
        this.changeClassPassword(passLength);
    }
}
// 授業パスワード変更
function changeClassPassword(passLength) {
    var targetClass = getBaseData().classList;
    var sheet;
    var password = '';
    for (var i = 0; i < targetClass.length; i++) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetClass[i]);
        password = createPassword(passLength);
        sheet.getRange(PASS_ROW, PASS_COL).setValue(password);
    }
}
// パスワード文字列作成
function createPassword(passLength) {
    var ret = '';
    // 生成する文字列に含める文字セット
    var p = PASS_STRINGS;
    var pl = PASS_STRINGS.length;
    for (var i = 0; i < passLength; i++) {
        ret += p[Math.floor(Math.random() * pl)];
    }
    return ret;
}
// アクセスユーザー情報取得
function getUserKey() {
    var userKey = Session.getTemporaryActiveUserKey();
    return userKey;
}
// 遅刻チェック
function checkLate(now, startTime, lateMinute) {
    var ret = false;
    var nowDateStrimg = Utilities.formatDate(now, 'JST', 'yyyy/MM/dd');
    var n = now.getTime();
    var s = new Date(nowDateStrimg + ' ' + startTime).getTime();
    var diff = n - s;
    var lateMinuteMs = lateMinute * 60 * 1000;
    if (diff >= lateMinuteMs) {
        ret = true;
    }
    return ret;
}
function test() {
    var now = new Date(); // 授業基本シート取得
    var baseSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
    // 遅刻判定
    var isLate = false;
    var lateMinute = baseSheet.getRange(LATE_ROW, LATE_COL).getValue();
    var startTime = baseSheet
        .getRange(CLA_START_T_ROW, CLA_START_T_COL)
        .getDisplayValue();
    if (lateMinute !== '' && isFinite(lateMinute)) {
        isLate = this.checkLate(now, startTime, lateMinute);
    }
}
