/**
 * ============================================================
 *  Flashcard Voice Game — 단일 프로젝트 (컨테이너 바인딩)
 *  배포 설정: 실행 = 나(소유자) / 액세스 권한 = Anyone (로그인 불필요)
 *  ※ 중요 평가가 아니므로 이메일 인증 대신 이름/학번 드롭다운 방식 채택
 * ============================================================
 *
 * 이 스크립트는 스프레드시트에 종속(컨테이너 바인딩)되어야 합니다.
 * → 대상 스프레드시트를 열고 [확장 프로그램 > Apps Script]로 여세요.
 *   (script.google.com에서 새 프로젝트를 만드는 방식이 아닙니다.)
 *
 * SHEET_ID, MIC_PAGE_URL 등 모든 설정값은 스크립트 속성이 아니라
 * 스프레드시트의 "환경설정" 탭(key | value)에서 읽어옵니다.
 */

function doGet() {
  var tmpl = HtmlService.createTemplateFromFile('Index');
  var config = getConfig_();
  tmpl.config = config;
  return tmpl.evaluate()
    .setTitle(config.APP_TITLE || 'Flashcard Voice Game')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** 스프레드시트를 열 때마다 상단에 메뉴를 생성 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎙️ Flashcard Voice Game')
    .addItem('ℹ️ 정보', 'showAbout_')
    .addToUi();
}

/** 메뉴 > 정보 클릭 시 뜨는 안내창 */
function showAbout_() {
  var ui = SpreadsheetApp.getUi();
  var msg =
    '버전 v1.0 (2026.07)\n\n' +
    '제작\n두리쌤\n\n' +
    '이용 조건\n' +
    '· 교육 목적으로 자유롭게 사용하실 수 있습니다.\n' +
    '· 재배포 시 출처(제작자 표기)를 유지해주세요.\n' +
    '· 코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.\n' +
    '· 수정이 필요하시면 아래 연락처로 요청해주세요.\n\n' +
    '데이터 안내\n' +
    '· 학생 이름·학번·응시 기록은 선생님의 스프레드시트에만 저장됩니다.\n' +
    '· 제작자는 이 데이터에 접근하지 않습니다.\n\n' +
    '문의\n' +
    '· Instagram: trdoolee\n' +
    '· 간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다';
  ui.alert('🎙️ Flashcard Voice Game', msg, ui.ButtonSet.OK);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSS_() {
  return SpreadsheetApp.getActiveSpreadsheet(); // 컨테이너 바인딩이므로 ID 불필요
}

/** "환경설정" 탭(key | value)을 객체로 읽어옵니다. */
function getConfig_() {
  var sheet = getSS_().getSheetByName('환경설정');
  var config = {};
  if (!sheet) return config;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (!key) continue;
    config[String(key).trim()] = data[i][1];
  }
  return config;
}

/** 클라이언트에서 필요 시 재조회할 수 있도록 별도 진입점도 열어둠 */
function getClientConfig() {
  return getConfig_();
}

function shuffle_(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/* ---------------- 학생 목록 (학년/반/이름 드롭다운용) ---------------- */

function getStudentList() {
  var sheet = getSS_().getSheetByName('학생명부');
  if (!sheet) return { success: false, message: '"학생명부" 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.' };
  var data = sheet.getDataRange().getValues();
  var list = [];
  // 헤더: 학년 | 반 | id(학번) | name(이름)
  for (var i = 1; i < data.length; i++) {
    if (!data[i][2]) continue;
    list.push({
      grade: String(data[i][0] || '').trim(),
      classNo: String(data[i][1] || '').trim(),
      id: String(data[i][2]).trim(),
      name: String(data[i][3] || '').trim()
    });
  }
  return { success: true, students: list };
}

/* ---------------- 출제 ---------------- */

/** 데이터 탭의 unit(단원) 열에서 중복 없는 값만 뽑아 반환. 값이 하나도 없으면 빈 배열. */
function getUnits() {
  var sheet = getSS_().getSheetByName('데이터');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var units = [];
  for (var i = 1; i < data.length; i++) {
    var u = data[i][3] ? String(data[i][3]).trim() : '';
    if (u && units.indexOf(u) === -1) units.push(u);
  }
  units.sort();
  return units;
}

function getQuiz(count, unit) {
  var sheet = getSS_().getSheetByName('데이터');
  if (!sheet) return { success: false, message: '"데이터" 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.' };
  var data = sheet.getDataRange().getValues();
  var pool = [];
  // 헤더: question | answers | timeLimit | unit | lang
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var rowUnit = data[i][3] ? String(data[i][3]).trim() : '';
    if (unit && rowUnit !== unit) continue; // 단원 필터 (unit이 비어있으면 전체 대상)
    pool.push({
      qid: i,
      question: String(data[i][0]),
      answers: String(data[i][1] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      timeLimit: data[i][2] ? Number(data[i][2]) : 5,
      unit: rowUnit,
      lang: data[i][4] ? String(data[i][4]).trim() : 'ko-KR'
    });
  }
  if (pool.length === 0) {
    return { success: false, message: unit
      ? ('"' + unit + '" 단원에 해당하는 문항이 없습니다.')
      : '"데이터" 탭에 출제할 문항이 없습니다. 문항을 먼저 입력해주세요.' };
  }
  shuffle_(pool);
  var n = Math.max(1, Math.min(Number(count) || pool.length, pool.length));
  return { success: true, quiz: pool.slice(0, n) };
}

/* ---------------- 결과 제출 및 기록 ---------------- */

function submitResult(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var sheet = getSS_().getSheetByName('기록');
    if (!sheet) return { success: false, message: '"기록" 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.' };
    var ts = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    var mode = payload.mode === 'TIME' ? '시간측정' : '채점';
    var studentId = payload.studentId || '';
    var studentName = payload.studentName || '';
    var unit = payload.unit || ''; // '' = 전체 범위로 응시

    if (payload.mode === 'TIME') {
      var elapsed = Number(payload.elapsedSeconds) || 0;
      // 일시 | 학번 | 이름 | 모드 | 점수 | 맞은문항수 | 틀린문항수 | 출제문항수 | 틀린문제들 | 소요시간(초) | 단원
      sheet.appendRow([ts, studentId, studentName, mode, '', '', '', payload.totalCount || 0, '', elapsed, unit]);
      return {
        success: true,
        mode: 'TIME',
        elapsedSeconds: elapsed,
        total: payload.totalCount,
        leaderboard: getLeaderboard_(unit, payload.totalCount)
      };
    }

    var total = Number(payload.totalCount) || 0;
    var correct = Number(payload.correctCount) || 0;
    var score = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    var wrongList = (payload.wrongQuestions && payload.wrongQuestions.length)
      ? payload.wrongQuestions.join(', ')
      : '없음 (만점)';

    sheet.appendRow([ts, studentId, studentName, mode, score, correct, total - correct, total, wrongList, '', unit]);
    return { success: true, mode: 'SCORE', score: score, correct: correct, total: total };
  } catch (err) {
    return { success: false, message: '기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 지정한 단원(unit) + 문항 수(totalCount)가 모두 일치하는 시간측정 모드 기록 중
 * 소요시간이 짧은 상위 3건을 반환합니다. (문항 수가 다르면 비교 자체가 불공정하므로 제외)
 */
function getLeaderboard_(unit, totalCount) {
  var sheet = getSS_().getSheetByName('기록');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowMode = data[i][3];
    var rowUnit = data[i][10] ? String(data[i][10]).trim() : '';
    var rowTotal = Number(data[i][7]);
    var elapsed = Number(data[i][9]);
    if (rowMode !== '시간측정') continue;
    if (rowUnit !== unit) continue;
    if (rowTotal !== Number(totalCount)) continue; // 문항 수가 다르면 비교 대상에서 제외
    if (!elapsed || elapsed <= 0) continue;
    rows.push({ elapsedSeconds: elapsed });
  }
  rows.sort(function (a, b) { return a.elapsedSeconds - b.elapsedSeconds; });
  return rows.slice(0, 3);
}
