/**
 * Taweed Lughoh — Apps Script backend, single-file version.
 * Google Sheets is the database, this script (deployed as a Web App) is
 * the API. See README.md for deployment steps and the full endpoint
 * reference. Sections below were originally split into separate files
 * (Config/SheetHelpers/Auth/Students/Attendance/Scores/Classes/Code/Seed)
 * — merged here purely for convenience, behavior is unchanged.
 */

/* ======================== Config ======================== */

var SHEET_NAMES = {
  USERS: 'Users',
  STUDENTS: 'Students',
  ATTENDANCE: 'Attendance',
  CLASSES: 'Classes',
}

var SHEET_HEADERS = {
  Users: ['id', 'username', 'password', 'salt', 'role', 'assignedClass', 'plainPassword'],
  Students: ['id', 'name', 'class', 'preTest', 'postTest'],
  Attendance: ['studentId', 'meeting', 'status'],
  Classes: ['id', 'name'],
}

var ROLES = {
  ADMIN: 'admin',
  TUTOR: 'tutor',
}

var ATTENDANCE_STATUSES = ['Present', 'Permission', 'Sick', 'Absent']

/**
 * Thrown for expected/handled failures (bad input, auth, not found).
 * Code.gs catches this separately from unexpected errors so the
 * `error` message is safe to return to the client as-is.
 */
function ApiError(message, statusCode) {
  this.name = 'ApiError'
  this.message = message
  this.statusCode = statusCode || 400
}
ApiError.prototype = Object.create(Error.prototype)

/**
 * Every class-id comparison (Students.class vs Users.assignedClass vs
 * Classes.id) goes through this instead of a bare String() cast. Rows
 * typed by hand into the sheet routinely pick up incidental leading/
 * trailing whitespace (autocomplete, copy-paste) that's invisible in the
 * Sheets UI but breaks exact-string matching — trimming here makes that
 * class of mismatch a non-issue instead of a silent 403.
 */
function normalizeId(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

/**
 * Sheets auto-detects date-like strings (the ISO dates used as meeting
 * ids) and silently converts that cell to its own Date type; reading it
 * back then returns a JS Date object instead of the original string.
 * JSON.stringify would turn that into a full "2026-07-21T16:00:00.000Z"
 * timestamp instead of the plain "2026-07-21" that was actually saved,
 * breaking every exact-string match this backend relies on for that
 * meeting going forward. This converts any Date value back to a plain
 * yyyy-MM-dd string; non-Date values pass through unchanged (e.g. the
 * "Pertemuan 1" style legacy labels, which were never dates to begin
 * with). See fixMeetingColumnType() for the one-time repair of already-
 * corrupted cells and locking the column format to prevent recurrence.
 */
function normalizeMeetingValue(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  }
  return String(value === undefined || value === null ? '' : value)
}

/* ======================== Sheet helpers ======================== */

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(SHEET_HEADERS[name])
  }
  return sheet
}

function getHeaders(sheet) {
  var lastColumn = sheet.getLastColumn()
  if (lastColumn === 0) return []
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
}

/** Reads every data row (excludes header) into an array of plain objects. */
function readAll(sheetName) {
  var sheet = getOrCreateSheet(sheetName)
  var headers = getHeaders(sheet)
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return []

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
  var results = []
  for (var i = 0; i < values.length; i++) {
    var row = values[i]
    var obj = {}
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c]
    }
    obj._row = i + 2 // 1-indexed sheet row, used internally for update/delete
    results.push(obj)
  }
  return results
}

/** Strips the internal _row bookkeeping field before returning data to callers. */
function stripInternal(obj) {
  var copy = {}
  for (var key in obj) {
    if (key !== '_row') copy[key] = obj[key]
  }
  return copy
}

function stripInternalAll(list) {
  return list.map(stripInternal)
}

/** Appends a new row, filling any header column missing from obj with ''. */
function appendRowObject(sheetName, obj) {
  var sheet = getOrCreateSheet(sheetName)
  var headers = getHeaders(sheet)
  var row = headers.map(function (key) {
    var value = obj[key]
    return value === undefined || value === null ? '' : value
  })
  sheet.appendRow(row)
  return obj
}

/**
 * Finds the row where column `matchColumn` equals `matchValue` and applies
 * `updates` (a partial object of column -> new value) to it in place.
 * Returns the merged object, or null if no matching row was found.
 */
function updateRowByColumn(sheetName, matchColumn, matchValue, updates) {
  var sheet = getOrCreateSheet(sheetName)
  var headers = getHeaders(sheet)
  var all = readAll(sheetName)
  var match = all.filter(function (row) {
    return String(row[matchColumn]) === String(matchValue)
  })[0]
  if (!match) return null

  var merged = {}
  for (var key in match) {
    if (key === '_row') continue
    merged[key] = updates.hasOwnProperty(key) ? updates[key] : match[key]
  }
  var rowValues = headers.map(function (key) {
    var value = merged[key]
    return value === undefined || value === null ? '' : value
  })
  sheet.getRange(match._row, 1, 1, headers.length).setValues([rowValues])
  return merged
}

/**
 * Same as updateRowByColumn but matches on multiple columns at once
 * (used for Attendance, which is keyed by studentId + meeting).
 */
function updateRowByColumns(sheetName, matchObj, updates) {
  var sheet = getOrCreateSheet(sheetName)
  var headers = getHeaders(sheet)
  var all = readAll(sheetName)
  var match = all.filter(function (row) {
    for (var key in matchObj) {
      if (String(row[key]) !== String(matchObj[key])) return false
    }
    return true
  })[0]
  if (!match) return null

  var merged = {}
  for (var key in match) {
    if (key === '_row') continue
    merged[key] = updates.hasOwnProperty(key) ? updates[key] : match[key]
  }
  var rowValues = headers.map(function (key) {
    var value = merged[key]
    return value === undefined || value === null ? '' : value
  })
  sheet.getRange(match._row, 1, 1, headers.length).setValues([rowValues])
  return merged
}

/** Deletes the row where column `matchColumn` equals `matchValue`. Returns true if a row was removed. */
function deleteRowByColumn(sheetName, matchColumn, matchValue) {
  var sheet = getOrCreateSheet(sheetName)
  var all = readAll(sheetName)
  var match = all.filter(function (row) {
    return String(row[matchColumn]) === String(matchValue)
  })[0]
  if (!match) return false
  sheet.deleteRow(match._row)
  return true
}

/* ======================== Auth ======================== */

/**
 * Session model: there is no session token. The client stores the `id`
 * returned by login() and resends it as `userId` on every request; each
 * request re-resolves the user's role/assignedClass fresh from the Users
 * sheet via requireUser(), so a client can never just claim a role. The
 * residual risk is that anyone who learns a valid user id can act as that
 * user without a password from the second request onward — ids are
 * generated with Utilities.getUuid() (unguessable) specifically to keep
 * that risk low. This tradeoff was chosen deliberately over a
 * CacheService-backed session token for simplicity.
 */

function generateSalt() {
  return Utilities.getUuid()
}

/**
 * The `password` column stays a SHA-256 hash — that's still what login()
 * checks. `plainPassword` is a deliberately-added convenience column so a
 * lost password doesn't require re-running a reset function; anyone with
 * view access to this sheet can read it, which is a real tradeoff for a
 * small internal tool. Existing sheets predate this column, so it's added
 * on demand rather than assumed to exist.
 */
function ensurePlainPasswordColumn() {
  var sheet = getOrCreateSheet(SHEET_NAMES.USERS)
  var headers = getHeaders(sheet)
  if (headers.indexOf('plainPassword') !== -1) return
  sheet.getRange(1, headers.length + 1).setValue('plainPassword')
}

function hashPassword(password, salt) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt,
    Utilities.Charset.UTF_8,
  )
  return digest
    .map(function (byte) {
      var v = (byte + 256) % 256
      return ('0' + v.toString(16)).slice(-2)
    })
    .join('')
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    assignedClass: user.assignedClass,
  }
}

/** Verifies credentials against the Users sheet. Returns a sanitized user or null. */
function login(username, password) {
  if (!username || !password) {
    throw new ApiError('username and password are required', 400)
  }
  var users = readAll(SHEET_NAMES.USERS)
  var user = users.filter(function (u) {
    return u.username === username
  })[0]
  if (!user) return null

  var computed = hashPassword(String(password), String(user.salt))
  if (computed !== user.password) return null

  return sanitizeUser(user)
}

function getUserById(userId) {
  if (!userId) return null
  var users = readAll(SHEET_NAMES.USERS)
  var user = users.filter(function (u) {
    return String(u.id) === String(userId)
  })[0]
  return user ? sanitizeUser(user) : null
}

/** Auth gate: every action except 'login' must pass through this first. */
function requireUser(userId) {
  var user = getUserById(userId)
  if (!user) throw new ApiError('Unauthorized', 401)
  return user
}

function requireAdmin(user) {
  if (user.role !== ROLES.ADMIN) {
    throw new ApiError('Forbidden: admin only', 403)
  }
}

/** Throws unless the user is an admin or a tutor assigned to classId. */
function assertClassAccess(user, classId) {
  if (user.role === ROLES.ADMIN) return
  if (user.role === ROLES.TUTOR && normalizeId(user.assignedClass) === normalizeId(classId)) {
    return
  }
  throw new ApiError(
    'Forbidden: no access to this class (your assignedClass is "' +
    user.assignedClass + '", this record\'s class is "' + classId + '")',
    403,
  )
}

/* ======================== Students ======================== */

/**
 * Create/update/delete are admin-only — tutors' only write access is
 * attendance and scores, per the "Tutor can ONLY edit attendance and
 * scores" requirement.
 */

/**
 * Builds an id -> student lookup used by saveAttendance/saveScores to
 * resolve each payload record's class for the access check. Throws
 * immediately on a duplicate id instead of silently letting the last
 * matching row win, which — with hundreds of hand-imported rows — was
 * capable of resolving a student to a completely different row (and
 * class) than the one the tutor actually saw on screen, surfacing as a
 * confusing "Forbidden: no access to this class" for a class that looked
 * right in the UI.
 */
function buildStudentsById(students) {
  var byId = {}
  students.forEach(function (s) {
    var id = String(s.id)
    if (byId.hasOwnProperty(id)) {
      throw new ApiError(
        'Duplicate student id "' + id + '" (at least "' + byId[id].name +
        '" and "' + s.name + '") — fix this in the Students sheet before saving.',
        409,
      )
    }
    byId[id] = s
  })
  return byId
}

function listStudents(user) {
  var students = stripInternalAll(readAll(SHEET_NAMES.STUDENTS))
  if (user.role === ROLES.TUTOR) {
    students = students.filter(function (s) {
      return normalizeId(s.class) === normalizeId(user.assignedClass)
    })
  }
  return students
}

function createStudent(user, payload) {
  requireAdmin(user)
  payload = payload || {}
  if (!payload.name || !payload.class) {
    throw new ApiError('name and class are required', 400)
  }
  var student = {
    id: Utilities.getUuid(),
    name: payload.name,
    class: payload.class,
    preTest: payload.preTest === undefined ? '' : payload.preTest,
    postTest: payload.postTest === undefined ? '' : payload.postTest,
  }
  appendRowObject(SHEET_NAMES.STUDENTS, student)
  return student
}

function updateStudentRecord(user, payload) {
  requireAdmin(user)
  payload = payload || {}
  if (!payload.id) throw new ApiError('id is required', 400)

  var updates = {}
  ;['name', 'class', 'preTest', 'postTest'].forEach(function (key) {
    if (payload.hasOwnProperty(key)) updates[key] = payload[key]
  })

  var updated = updateRowByColumn(SHEET_NAMES.STUDENTS, 'id', payload.id, updates)
  if (!updated) throw new ApiError('Student not found', 404)
  return updated
}

function deleteStudentRecord(user, payload) {
  requireAdmin(user)
  payload = payload || {}
  if (!payload.id) throw new ApiError('id is required', 400)

  var deleted = deleteRowByColumn(SHEET_NAMES.STUDENTS, 'id', payload.id)
  if (!deleted) throw new ApiError('Student not found', 404)
  return { id: payload.id }
}

/* ======================== Attendance ======================== */

/** Rows are keyed by (studentId, meeting) rather than a synthetic id. */

function listAttendance(user, params) {
  var records = stripInternalAll(readAll(SHEET_NAMES.ATTENDANCE)).map(function (r) {
    return { studentId: r.studentId, meeting: normalizeMeetingValue(r.meeting), status: r.status }
  })

  if (user.role === ROLES.TUTOR) {
    var classStudentIds = readAll(SHEET_NAMES.STUDENTS)
      .filter(function (s) {
        return normalizeId(s.class) === normalizeId(user.assignedClass)
      })
      .map(function (s) {
        return String(s.id)
      })
    records = records.filter(function (r) {
      return classStudentIds.indexOf(String(r.studentId)) !== -1
    })
  }

  if (params && params.meeting) {
    records = records.filter(function (r) {
      return String(r.meeting) === String(params.meeting)
    })
  }
  if (params && params.studentId) {
    records = records.filter(function (r) {
      return String(r.studentId) === String(params.studentId)
    })
  }

  return records
}

/**
 * Upserts a batch of {studentId, meeting, status} records. Every record is
 * validated and access-checked individually before any writes happen, so a
 * request either fully succeeds or fails without partial writes.
 */
function saveAttendance(user, payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ApiError('payload must be a non-empty array', 400)
  }

  var studentsById = buildStudentsById(readAll(SHEET_NAMES.STUDENTS))

  payload.forEach(function (record) {
    if (!record.studentId || !record.meeting || !record.status) {
      throw new ApiError('studentId, meeting and status are required', 400)
    }
    if (ATTENDANCE_STATUSES.indexOf(record.status) === -1) {
      throw new ApiError('Invalid status: ' + record.status, 400)
    }
    var student = studentsById[String(record.studentId)]
    if (!student) {
      throw new ApiError('Unknown studentId: ' + record.studentId, 400)
    }
    assertClassAccess(user, student.class)
  })

  // One read of the whole sheet, then direct per-row writes below — not a
  // fresh full-sheet scan per record (updateRowByColumns does exactly that
  // internally, which turns an N-record save into an N x sheet-size scan;
  // with attendance growing by ~one row per student per meeting, that got
  // slow enough to time out as the sheet grew).
  var sheet = getOrCreateSheet(SHEET_NAMES.ATTENDANCE)
  var headers = getHeaders(sheet)
  var statusCol = headers.indexOf('status') + 1
  var meetingCol = headers.indexOf('meeting') + 1
  var studentIdCol = headers.indexOf('studentId') + 1
  var rowByKey = {}
  readAll(SHEET_NAMES.ATTENDANCE).forEach(function (row) {
    // normalizeMeetingValue: the row we're keying off may already have
    // been silently converted to a Date by Sheets on a previous write,
    // before this request's own values ever get a chance to be — without
    // this, an existing row would never match and every "update" would
    // append a duplicate new row instead.
    rowByKey[row.studentId + '::' + normalizeMeetingValue(row.meeting)] = row
  })

  var newRows = []
  var results = payload.map(function (record) {
    var existing = rowByKey[record.studentId + '::' + record.meeting]
    if (existing) {
      sheet.getRange(existing._row, statusCol).setValue(record.status)
    } else {
      newRows.push(
        headers.map(function (key) {
          var value = { studentId: record.studentId, meeting: record.meeting, status: record.status }[key]
          return value === undefined ? '' : value
        }),
      )
    }
    return { studentId: record.studentId, meeting: record.meeting, status: record.status }
  })

  if (newRows.length > 0) {
    var startRow = sheet.getLastRow() + 1
    // Lock the meeting column to plain text BEFORE writing, so Sheets
    // never gets a chance to auto-convert a date-like "meeting" value
    // (e.g. "2026-07-21") to its own Date type on these new rows — see
    // normalizeMeetingValue() for what that conversion breaks.
    if (meetingCol > 0) {
      sheet.getRange(startRow, meetingCol, newRows.length, 1).setNumberFormat('@')
    }
    // Same protection for studentId: some student ids (e.g. "7e12", a
    // class-7 roster entry) are valid scientific notation syntax, so
    // Sheets silently rewrites that cell to the number 7e12 on write
    // unless the column is already locked to plain text. That breaks
    // every lookup keyed by studentId for that row (shows as #N/A).
    if (studentIdCol > 0) {
      sheet.getRange(startRow, studentIdCol, newRows.length, 1).setNumberFormat('@')
    }
    sheet.getRange(startRow, 1, newRows.length, headers.length).setValues(newRows)
  }

  return results
}

/* ======================== Scores ======================== */

/**
 * Scores live on the Students sheet (preTest/postTest columns) — there is
 * no separate Scores tab. This is the class-scoped read/write surface
 * tutors use to edit them, distinct from the admin-only Students
 * create/update/delete endpoints.
 */

function listScores(user, params) {
  var students = readAll(SHEET_NAMES.STUDENTS)
  if (user.role === ROLES.TUTOR) {
    students = students.filter(function (s) {
      return normalizeId(s.class) === normalizeId(user.assignedClass)
    })
  }
  if (params && params.class) {
    students = students.filter(function (s) {
      return normalizeId(s.class) === normalizeId(params.class)
    })
  }
  return students.map(function (s) {
    return {
      studentId: s.id,
      name: s.name,
      class: s.class,
      preTest: s.preTest,
      postTest: s.postTest,
    }
  })
}

/** Upserts preTest/postTest for a batch of {studentId, preTest?, postTest?} records. */
function saveScores(user, payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ApiError('payload must be a non-empty array', 400)
  }

  var studentsById = buildStudentsById(readAll(SHEET_NAMES.STUDENTS))

  payload.forEach(function (record) {
    if (!record.studentId) throw new ApiError('studentId is required', 400)
    var student = studentsById[String(record.studentId)]
    if (!student) throw new ApiError('Unknown studentId: ' + record.studentId, 400)
    assertClassAccess(user, student.class)
  })

  // Reuses the single readAll() above (studentsById) plus its _row indices
  // for direct per-cell writes, instead of updateRowByColumn's fresh
  // full-sheet scan per record — same fix as saveAttendance below.
  var sheet = getOrCreateSheet(SHEET_NAMES.STUDENTS)
  var headers = getHeaders(sheet)
  var preTestCol = headers.indexOf('preTest') + 1
  var postTestCol = headers.indexOf('postTest') + 1

  var results = payload.map(function (record) {
    var student = studentsById[String(record.studentId)]
    if (record.hasOwnProperty('preTest')) {
      student.preTest = record.preTest
      sheet.getRange(student._row, preTestCol).setValue(record.preTest === null ? '' : record.preTest)
    }
    if (record.hasOwnProperty('postTest')) {
      student.postTest = record.postTest
      sheet.getRange(student._row, postTestCol).setValue(record.postTest === null ? '' : record.postTest)
    }
    return {
      studentId: student.id,
      name: student.name,
      class: student.class,
      preTest: student.preTest,
      postTest: student.postTest,
    }
  })

  return results
}

/* ======================== Classes ======================== */

/** Read-only. Tutors only ever see their own assigned class. */

function listClasses(user) {
  var classes = stripInternalAll(readAll(SHEET_NAMES.CLASSES))
  if (user.role === ROLES.TUTOR) {
    classes = classes.filter(function (c) {
      return normalizeId(c.id) === normalizeId(user.assignedClass)
    })
  }
  return classes
}

/* ======================== Web app entry points ======================== */

/**
 * Apps Script only exposes doGet/doPost (no native PUT/DELETE), so every
 * mutation is routed through doPost with an `action` field instead of an
 * HTTP verb — see README.md for the full action list and how it maps to
 * the originally requested REST endpoints.
 *
 * CORS note: ContentService has no API to set response headers, so there
 * is no explicit "enable CORS" step in this code. The practical way this
 * works cross-origin from a browser is on the REQUEST side: POST bodies
 * must be sent with Content-Type: text/plain (not application/json) so the
 * browser treats it as a "simple request" and skips the CORS preflight
 * that Apps Script cannot answer. See README.md.
 */

function doGet(e) {
  return handleRequest(e, 'GET')
}

function doPost(e) {
  return handleRequest(e, 'POST')
}

function handleRequest(e, method) {
  try {
    var params = parseParams(e, method)
    var action = params.action
    if (!action) throw new ApiError('Missing action', 400)

    if (action === 'login') {
      if (method !== 'POST') throw new ApiError('login requires POST', 405)
      var result = login(params.username, params.password)
      if (!result) throw new ApiError('Invalid username or password', 401)
      return respond(true, result)
    }

    var user = requireUser(params.userId)
    var data = route(method, action, user, params)
    return respond(true, data)
  } catch (err) {
    var message = err && err.message ? err.message : String(err)
    return respond(false, null, message)
  }
}

function route(method, action, user, params) {
  if (method === 'GET') {
    switch (action) {
      case 'students':
        return listStudents(user)
      case 'attendance':
        return listAttendance(user, params)
      case 'scores':
        return listScores(user, params)
      case 'classes':
        return listClasses(user)
      default:
        throw new ApiError('Unknown GET action: ' + action, 400)
    }
  }

  if (method === 'POST') {
    switch (action) {
      case 'createStudent':
        return createStudent(user, params.payload)
      case 'updateStudent':
        return updateStudentRecord(user, params.payload)
      case 'deleteStudent':
        return deleteStudentRecord(user, params.payload)
      case 'saveAttendance':
        return saveAttendance(user, params.payload)
      case 'saveScores':
        return saveScores(user, params.payload)
      default:
        throw new ApiError('Unknown POST action: ' + action, 400)
    }
  }

  throw new ApiError('Unsupported method: ' + method, 405)
}

/** Normalizes doGet's e.parameter and doPost's JSON body into one shape. */
function parseParams(e, method) {
  if (method === 'GET') {
    return e && e.parameter ? e.parameter : {}
  }
  var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}'
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new ApiError('Invalid JSON body', 400)
  }
}

function respond(success, data, error) {
  var body = { success: success }
  if (data !== undefined && data !== null) body.data = data
  if (error) body.error = error
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

/* ======================== Seed (run once) ======================== */

/**
 * Open this project in the Apps Script editor (bound to the target
 * spreadsheet), select `seedInitialData` in the function dropdown, click
 * Run, and authorize when prompted. Safe to re-run: each tab is only
 * seeded if it's currently empty (header row only).
 *
 * The generated admin/tutor passwords are written to the execution log
 * (View > Logs) only — never returned by any endpoint, never stored in
 * plaintext, and never leaves your own Apps Script execution. Copy them
 * from the log immediately; they cannot be recovered afterwards, only
 * reset by editing the Users sheet's password/salt with a freshly
 * computed hash.
 */

function seedInitialData() {
  seedClasses()
  seedStudents()
  seedAttendance()
  seedUsers()
  Logger.log('Seeding complete.')
}

/**
 * Lost the password shown during seedInitialData? It can't be recovered
 * (only the hash is stored), but it can be reset. Pick one of these two
 * from the function dropdown and click Run — the Apps Script "Run" button
 * can't take arguments, hence one wrapper per seeded account. View > Logs
 * afterward for the new plaintext password (shown once, same as seeding).
 */
function resetAdminPassword() {
  resetPassword('admin')
}

function resetTutorPassword() {
  resetPassword('tutor.kelas7')
}

function resetPassword(username) {
  ensurePlainPasswordColumn()
  var user = readAll(SHEET_NAMES.USERS).filter(function (u) {
    return u.username === username
  })[0]
  if (!user) {
    Logger.log('No user found with username: ' + username)
    return
  }
  var password = Utilities.getUuid().slice(0, 8)
  var salt = generateSalt()
  updateRowByColumn(SHEET_NAMES.USERS, 'id', user.id, {
    password: hashPassword(password, salt),
    plainPassword: password,
    salt: salt,
  })
  Logger.log(
    'Password reset for ' + username + ' -> new password: ' + password +
    ' (shown once, save it now)',
  )
}

/**
 * Creates one tutor account per class name listed in TARGET_CLASS_NAMES
 * below, looked up dynamically against the Classes sheet (not a
 * hardcoded class id — safer if classes ever get renumbered again).
 * Username is "tutor." + the class name lowercased (e.g. "7A" ->
 * "tutor.7a"). Skips any class it can't find and any username that
 * already exists, so it's safe to edit the list and re-run. Logs each
 * new account's plaintext password once, same as seedUsers/resetPassword.
 *
 * Edit TARGET_CLASS_NAMES to match whichever classes you actually need
 * tutors for — this is a one-off admin script, not meant to be run
 * unmodified forever.
 */
function createTutorsForClasses() {
  var TARGET_CLASS_NAMES = [
    '7A', '7B', '7C', '7D', '7E',
    '8A', '8B', '8C', '8D', '8E',
    '9A', '9B', '9C', '9D',
    '10A', '10B', '10C', '10D',
    '11A', '11B', '11C', '11D',
    '12A', '12B', '12C',
  ]

  ensurePlainPasswordColumn()

  var classByName = {}
  readAll(SHEET_NAMES.CLASSES).forEach(function (c) {
    classByName[normalizeId(c.name)] = c
  })

  var existingUsernames = {}
  readAll(SHEET_NAMES.USERS).forEach(function (u) {
    existingUsernames[normalizeId(u.username)] = true
  })

  var created = 0
  TARGET_CLASS_NAMES.forEach(function (className) {
    var cls = classByName[normalizeId(className)]
    if (!cls) {
      Logger.log('No class found named "' + className + '" in the Classes sheet — skipping.')
      return
    }

    var username = 'tutor.' + className.toLowerCase()
    if (existingUsernames[normalizeId(username)]) {
      Logger.log('Username "' + username + '" already exists — skipping.')
      return
    }

    var password = Utilities.getUuid().slice(0, 8)
    var salt = generateSalt()
    appendRowObject(SHEET_NAMES.USERS, {
      id: Utilities.getUuid(),
      username: username,
      password: hashPassword(password, salt),
      plainPassword: password,
      salt: salt,
      role: ROLES.TUTOR,
      assignedClass: cls.id,
    })
    Logger.log(
      'Created tutor for ' + className + ' (' + cls.id + ') -> username: ' + username +
      ' | password: ' + password + ' (shown once, save it now)',
    )
    created++
  })

  Logger.log('Done. Created ' + created + ' new tutor account(s).')
}

/**
 * Sets a password YOU choose (instead of a random generated one) for
 * specific accounts. Edit CUSTOM_PASSWORDS below with username -> desired
 * password pairs, then Run. Updates both the login hash and the
 * plainPassword column so they stay consistent. Skips any username it
 * can't find. Short/simple passwords are an easier-to-remember tradeoff —
 * fine for a small internal tool, just don't reuse a real personal
 * password here since plainPassword keeps it readable in the sheet.
 */
function setCustomPasswords() {
  var CUSTOM_PASSWORDS = {
    'tutor.7a': 'kelas7a',
    'tutor.7b': 'kelas7b',
    'tutor.7c': 'kelas7c',
    'tutor.7d': 'kelas7d',
    'tutor.7e': 'kelas7e',
    'tutor.8a': 'kelas8a',
    'tutor.8b': 'kelas8b',
    'tutor.8c': 'kelas8c',
    'tutor.8d': 'kelas8d',
    'tutor.8e': 'kelas8e',
    'tutor.9a': 'kelas9a',
    'tutor.9b': 'kelas9b',
    'tutor.9c': 'kelas9c',
    'tutor.9d': 'kelas9d',
    'tutor.10a': 'kelas10a',
    'tutor.10b': 'kelas10b',
    'tutor.10c': 'kelas10c',
    'tutor.10d': 'kelas10d',
    'tutor.11a': 'kelas11a',
    'tutor.11b': 'kelas11b',
    'tutor.11c': 'kelas11c',
    'tutor.11d': 'kelas11d',
    'tutor.12a': 'kelas12a',
    'tutor.12b': 'kelas12b',
    'tutor.12c': 'kelas12c',
  }

  ensurePlainPasswordColumn()
  var users = readAll(SHEET_NAMES.USERS)

  Object.keys(CUSTOM_PASSWORDS).forEach(function (username) {
    var user = users.filter(function (u) {
      return u.username === username
    })[0]
    if (!user) {
      Logger.log('No user found with username "' + username + '" — skipping.')
      return
    }
    var password = CUSTOM_PASSWORDS[username]
    var salt = generateSalt()
    updateRowByColumn(SHEET_NAMES.USERS, 'id', user.id, {
      password: hashPassword(password, salt),
      plainPassword: password,
      salt: salt,
    })
    Logger.log('Password updated for ' + username + ' -> ' + password)
  })

  Logger.log('Done.')
}

/**
 * One-time repair for rows added by hand directly in the sheet (e.g. pasted
 * tutor rows without password/salt, or a Classes tab missing entries that
 * tutors were already assigned to). Safe to re-run — every step only
 * touches what's actually missing or malformed.
 */
function fixTutorSetup() {
  addMissingClasses()
  fixUserAccounts()
  Logger.log('fixTutorSetup complete.')
}

/**
 * Directly exercises saveAttendance() -> listAttendance() in this exact
 * deployment, bypassing HTTP/frontend entirely, to isolate whether a
 * reported "status always saves as Present" bug is in the backend or
 * somewhere else. Writes one real row under a throwaway meeting id,
 * reads it back, checks it matches, then deletes that row so nothing
 * fake is left in the sheet. Run from the function dropdown -> View ->
 * Logs.
 */
function debugSaveAttendanceRoundtrip() {
  var admin = readAll(SHEET_NAMES.USERS).filter(function (u) {
    return u.role === ROLES.ADMIN
  })[0]
  if (!admin) {
    Logger.log('No admin user found — cannot run this test.')
    return
  }
  var adminUser = sanitizeUser(admin)

  var testStudent = readAll(SHEET_NAMES.STUDENTS)[0]
  if (!testStudent) {
    Logger.log('No students found — cannot run this test.')
    return
  }

  var testMeeting = '__debug_roundtrip__'
  var testStatus = 'Sick'

  Logger.log(
    'Saving status "' + testStatus + '" for ' + testStudent.name +
    ' (' + testStudent.id + ') on meeting "' + testMeeting + '"...',
  )
  var saveResult = saveAttendance(adminUser, [
    { studentId: testStudent.id, meeting: testMeeting, status: testStatus },
  ])
  Logger.log('saveAttendance() returned: ' + JSON.stringify(saveResult))

  var readBack = listAttendance(adminUser, { meeting: testMeeting })
  Logger.log('listAttendance() returned: ' + JSON.stringify(readBack))

  var matching = readBack.filter(function (r) {
    return String(r.studentId) === String(testStudent.id)
  })[0]

  if (matching && matching.status === testStatus) {
    Logger.log('PASS: status round-tripped correctly as "' + matching.status + '".')
  } else {
    Logger.log(
      'FAIL: expected status "' + testStatus + '" but got: ' + JSON.stringify(matching),
    )
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.ATTENDANCE)
  var testRow = readAll(SHEET_NAMES.ATTENDANCE).filter(function (r) {
    return r.meeting === testMeeting
  })[0]
  if (testRow) {
    sheet.deleteRow(testRow._row)
    Logger.log('Cleaned up the test row — nothing fake left behind.')
  }
}

/**
 * Prints every tutor's assignedClass and every distinct Students.class
 * value, each wrapped in [brackets], to the log. Run this when a tutor
 * gets "Forbidden: no access to this class" despite the class looking
 * right in the UI — the bracket wrapping makes stray leading/trailing
 * whitespace (invisible in the Sheets UI) visible in the log, and you can
 * eyeball whether a tutor's assignedClass has an exact match in the
 * Students.class list. (As of this version, matching already trims
 * whitespace automatically via normalizeId() — this is for spotting a
 * genuine id mismatch, e.g. a student's class was typed as a class NAME
 * like "8A" instead of its id like "cls-16".)
 */
function debugClassAccess() {
  var users = readAll(SHEET_NAMES.USERS)
  var studentClasses = readAll(SHEET_NAMES.STUDENTS).map(function (s) {
    return s.class
  })
  var distinctStudentClasses = studentClasses.filter(function (value, index) {
    return studentClasses.indexOf(value) === index
  })

  Logger.log('--- Tutor assignedClass values ---')
  users
    .filter(function (u) {
      return u.role === ROLES.TUTOR
    })
    .forEach(function (u) {
      Logger.log(u.username + ' -> assignedClass: [' + u.assignedClass + ']')
    })

  Logger.log('--- Distinct Students.class values ---')
  distinctStudentClasses.forEach(function (value) {
    Logger.log('[' + value + ']')
  })

  Logger.log('--- Classes sheet (id -> name) ---')
  readAll(SHEET_NAMES.CLASSES).forEach(function (c) {
    Logger.log('[' + c.id + '] -> ' + c.name)
  })
}

/**
 * Scans every row in Students and reports which ones have a `class` value
 * that doesn't match any id in the Classes sheet — the thing manually
 * screenshotting hundreds of rows can't realistically catch. Also logs a
 * per-class student count so you can sanity-check the overall
 * distribution. Run from the function dropdown → View → Logs.
 */
function validateStudentClasses() {
  var classes = readAll(SHEET_NAMES.CLASSES)
  var classIds = {}
  classes.forEach(function (c) {
    classIds[normalizeId(c.id)] = c.name
  })

  var students = readAll(SHEET_NAMES.STUDENTS)
  var countByClass = {}
  var orphaned = []

  students.forEach(function (s) {
    var classId = normalizeId(s.class)
    if (classIds.hasOwnProperty(classId)) {
      countByClass[classId] = (countByClass[classId] || 0) + 1
    } else {
      orphaned.push(s)
    }
  })

  Logger.log('--- Student count per class ---')
  classes.forEach(function (c) {
    var id = normalizeId(c.id)
    Logger.log(c.name + ' (' + id + '): ' + (countByClass[id] || 0) + ' students')
  })

  Logger.log('--- Students whose class matches NO Classes.id (' + orphaned.length + ' total) ---')
  orphaned.slice(0, 100).forEach(function (s) {
    Logger.log(s.id + ' | ' + s.name + ' | class: [' + s.class + ']')
  })
  if (orphaned.length > 100) {
    Logger.log('... and ' + (orphaned.length - 100) + ' more, truncated.')
  }
  if (orphaned.length === 0) {
    Logger.log('None — every student has a valid class id.')
  }
}

/**
 * Finds Students rows sharing the same id. saveAttendance/saveScores now
 * refuse to save at all when this happens (see buildStudentsById) rather
 * than silently resolving a student to whichever duplicate row happened
 * to be read last — which is exactly what turned "no access to this
 * class" into a confusing error for a class that looked correct on
 * screen. Run this first, before saving fails and asks you to.
 */
function findDuplicateStudentIds() {
  var students = readAll(SHEET_NAMES.STUDENTS)
  var byId = {}
  students.forEach(function (s) {
    var id = String(s.id)
    if (!byId[id]) byId[id] = []
    byId[id].push(s)
  })

  var duplicateCount = 0
  Object.keys(byId).forEach(function (id) {
    var rows = byId[id]
    if (rows.length < 2) return
    duplicateCount++
    Logger.log('Duplicate id "' + id + '" appears ' + rows.length + ' times:')
    rows.forEach(function (s) {
      Logger.log('  row ' + s._row + ': ' + s.name + ' | class: [' + s.class + ']')
    })
  })

  if (duplicateCount === 0) {
    Logger.log('No duplicate student ids found.')
  } else {
    Logger.log(duplicateCount + ' duplicate id(s) found — see above. Give each row a unique id (edit the id cell directly) to fix.')
  }
}

/**
 * Assigns a fresh unique id to every row after the first in each
 * duplicate-id group (the first occurrence keeps its original id).
 *
 * Only safe to run if no attendance/scores were ever successfully saved
 * under one of the shared ids — saveAttendance/saveScores validate the
 * entire batch before writing anything (buildStudentsById throws before
 * any row is touched), so a save that included a duplicate never
 * partially went through, but this does NOT check the Attendance sheet
 * itself. If in doubt, check there first for these ids before running.
 * Safe to re-run: once there are no duplicates left, it's a no-op.
 */
function fixDuplicateStudentIds() {
  var sheet = getOrCreateSheet(SHEET_NAMES.STUDENTS)
  var headers = getHeaders(sheet)
  var idCol = headers.indexOf('id') + 1
  var students = readAll(SHEET_NAMES.STUDENTS)

  var groups = {}
  students.forEach(function (s) {
    var id = String(s.id)
    if (!groups[id]) groups[id] = []
    groups[id].push(s)
  })

  var changed = 0
  Object.keys(groups).forEach(function (id) {
    var rows = groups[id]
    if (rows.length < 2) return
    for (var i = 1; i < rows.length; i++) {
      var newId = Utilities.getUuid()
      sheet.getRange(rows[i]._row, idCol).setValue(newId)
      Logger.log(
        'row ' + rows[i]._row + ' (' + rows[i].name + '): id changed from "' +
        id + '" to "' + newId + '"',
      )
      changed++
    }
  })

  Logger.log('Done. Reassigned ids for ' + changed + ' row(s). Run findDuplicateStudentIds again to confirm none remain.')
}

/**
 * Repairs the root cause behind meetings that "lose" their saved
 * attendance after navigating away and back: Sheets auto-detects a
 * date-like "meeting" value (e.g. "2026-07-21") and silently converts
 * that cell to its own Date type. Reading it back then returns a
 * timestamp like "2026-07-21T16:00:00.000Z" instead of the original
 * string, which no longer matches the plain date the app uses as that
 * meeting's id anywhere else — the meeting looks like it reverted to
 * defaults because, from the app's perspective, its attendance rows
 * belong to a different (mistyped) meeting id now.
 *
 * This does two things:
 *  1. Rewrites every already-converted cell in the meeting column back
 *     to a plain yyyy-MM-dd string.
 *  2. Locks that column's format to plain text so Sheets can't silently
 *     convert it again on future writes (saveAttendance also does this
 *     for newly appended rows going forward, but this covers the column
 *     as a whole, including rows written before that existed).
 *
 * Safe to re-run — rows that are already plain text are left untouched.
 */
function fixMeetingColumnType() {
  var sheet = getOrCreateSheet(SHEET_NAMES.ATTENDANCE)
  var headers = getHeaders(sheet)
  var meetingCol = headers.indexOf('meeting') + 1
  if (meetingCol === 0) {
    Logger.log('No "meeting" column found — nothing to fix.')
    return
  }

  var lastRow = sheet.getLastRow()
  if (lastRow >= 2) {
    var values = sheet.getRange(2, meetingCol, lastRow - 1, 1).getValues()
    var fixed = 0
    for (var i = 0; i < values.length; i++) {
      var value = values[i][0]
      if (Object.prototype.toString.call(value) === '[object Date]') {
        var iso = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        sheet.getRange(i + 2, meetingCol).setValue(iso)
        Logger.log('row ' + (i + 2) + ': meeting was a Date, fixed to "' + iso + '"')
        fixed++
      }
    }
    Logger.log('Fixed ' + fixed + ' already-converted cell(s).')
  }

  // Lock the whole column (including headroom for future rows) to plain
  // text so this can't silently happen again.
  sheet.getRange(1, meetingCol, sheet.getMaxRows(), 1).setNumberFormat('@')
  Logger.log('Meeting column locked to plain text format.')
}

/**
 * Repairs Attendance rows whose studentId was silently rewritten from a
 * scientific-notation-looking id (e.g. "7e12") to the number it evaluates
 * to (7000000000000) — the same class of bug fixed for the meeting column
 * above, now also guarded against in saveAttendance() going forward.
 *
 * Each corrupted numeric value is reconstructed with toExponential() (not
 * String(), which would print the expanded decimal form instead of the
 * "7e12" shape we actually want back) and only written back once it's
 * confirmed to match a real id in the Students sheet — never guessed.
 * Anything that can't be confidently matched is logged, not touched, so a
 * genuinely ambiguous case can be fixed by hand instead of miscorrected.
 *
 * Safe to re-run — rows that are already text are left untouched.
 */
function fixStudentIdColumnType() {
  var sheet = getOrCreateSheet(SHEET_NAMES.ATTENDANCE)
  var headers = getHeaders(sheet)
  var studentIdCol = headers.indexOf('studentId') + 1
  if (studentIdCol === 0) {
    Logger.log('No "studentId" column found — nothing to fix.')
    return
  }

  var knownIds = {}
  readAll(SHEET_NAMES.STUDENTS).forEach(function (s) {
    knownIds[String(s.id)] = true
  })

  var lastRow = sheet.getLastRow()
  if (lastRow >= 2) {
    var values = sheet.getRange(2, studentIdCol, lastRow - 1, 1).getValues()
    var fixed = 0
    var unresolved = []
    for (var i = 0; i < values.length; i++) {
      var value = values[i][0]
      if (typeof value !== 'number') continue

      var match = /^(-?\d+(?:\.\d+)?)e\+(\d+)$/.exec(value.toExponential())
      var candidate = match ? match[1] + 'e' + match[2] : null

      if (candidate && knownIds[candidate]) {
        sheet.getRange(i + 2, studentIdCol).setValue(candidate)
        Logger.log('row ' + (i + 2) + ': studentId ' + value + ' fixed to "' + candidate + '"')
        fixed++
      } else {
        unresolved.push({ row: i + 2, value: value, candidate: candidate })
      }
    }
    Logger.log('Fixed ' + fixed + ' already-converted cell(s).')
    if (unresolved.length > 0) {
      Logger.log(
        'Could not confidently resolve ' + unresolved.length + ' row(s) — ' +
          'reconstructed id did not match any Students.id, left untouched ' +
          'for manual review: ' + JSON.stringify(unresolved),
      )
    }
  }

  // Lock the whole column (including headroom for future rows) to plain
  // text so this can't silently happen again — mirrors fixMeetingColumnType().
  sheet.getRange(1, studentIdCol, sheet.getMaxRows(), 1).setNumberFormat('@')
  Logger.log('studentId column locked to plain text format.')
}

/**
 * Adds any of the 16 standard classes (cls-1..cls-16, "Kelas 7".."Kelas 22")
 * not already present in the Classes sheet. Existing classes are untouched.
 */
function addMissingClasses() {
  var allClasses = []
  for (var i = 1; i <= 16; i++) {
    allClasses.push({ id: 'cls-' + i, name: 'Kelas ' + (i + 6) })
  }
  var existingIds = readAll(SHEET_NAMES.CLASSES).map(function (c) {
    return String(c.id)
  })
  var added = 0
  allClasses.forEach(function (cls) {
    if (existingIds.indexOf(cls.id) !== -1) return
    appendRowObject(SHEET_NAMES.CLASSES, cls)
    added++
  })
  Logger.log('Added ' + added + ' missing class(es).')
}

/**
 * Fixes two things per Users row, independently:
 *  - missing password/salt -> generates and logs a new plaintext password
 *    (same one-time-log behavior as seeding/reset).
 *  - a non-UUID id (e.g. hand-typed as the username itself) -> replaced
 *    with a proper random UUID. A guessable id defeats the "no session
 *    token, trust the id" auth model this backend relies on (see Auth
 *    section above), so this matters even though login credentials
 *    (username/password) are unaffected by it.
 */
function fixUserAccounts() {
  ensurePlainPasswordColumn()
  var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  var users = readAll(SHEET_NAMES.USERS)
  var fixed = 0

  users.forEach(function (user) {
    var updates = {}
    var needsFix = false

    if (!uuidPattern.test(String(user.id))) {
      updates.id = Utilities.getUuid()
      needsFix = true
    }
    // Accounts that already have password+salt are left alone here even if
    // plainPassword is blank — the plaintext can't be recovered from a
    // hash, and silently resetting an already-working login would be a
    // surprise. Use resetAdminPassword/resetTutorPassword/resetPassword to
    // deliberately reset one of those and populate plainPassword too.
    if (!user.password || !user.salt) {
      var password = Utilities.getUuid().slice(0, 8)
      var salt = generateSalt()
      updates.password = hashPassword(password, salt)
      updates.plainPassword = password
      updates.salt = salt
      needsFix = true
      Logger.log(
        'Password set for ' + user.username + ' -> password: ' + password +
        ' (shown once, save it now)',
      )
    }

    if (!needsFix) return
    updateRowByColumn(SHEET_NAMES.USERS, 'username', user.username, updates)
    fixed++
  })

  Logger.log('Fixed ' + fixed + ' user account(s).')
}

function isSheetEmpty(sheetName) {
  var sheet = getOrCreateSheet(sheetName)
  return sheet.getLastRow() < 2
}

function seedClasses() {
  if (!isSheetEmpty(SHEET_NAMES.CLASSES)) {
    Logger.log('Classes already has data, skipping.')
    return
  }
  var classes = [
    { id: 'cls-1', name: 'Kelas 7' },
    { id: 'cls-2', name: 'Kelas 8' },
    { id: 'cls-3', name: 'Kelas 9' },
    { id: 'cls-4', name: 'Kelas 10' },
    { id: 'cls-5', name: 'Kelas 11' },
    { id: 'cls-6', name: 'Kelas 12' },
  ]
  classes.forEach(function (c) {
    appendRowObject(SHEET_NAMES.CLASSES, c)
  })
  Logger.log('Seeded ' + classes.length + ' classes.')
}

function seedStudents() {
  if (!isSheetEmpty(SHEET_NAMES.STUDENTS)) {
    Logger.log('Students already has data, skipping.')
    return
  }
  var students = [
    { id: 'std-1', name: 'Ahmad Fauzan', class: 'cls-1', preTest: 62, postTest: 84 },
    { id: 'std-2', name: 'Siti Nur Halimah', class: 'cls-1', preTest: 58, postTest: 79 },
    { id: 'std-3', name: 'Muhammad Rizki', class: 'cls-1', preTest: 71, postTest: 90 },
    { id: 'std-4', name: 'Aisyah Putri', class: 'cls-2', preTest: 65, postTest: 88 },
    { id: 'std-5', name: 'Abdullah Zam', class: 'cls-2', preTest: 54, postTest: 76 },
    { id: 'std-6', name: 'Khadijah Amalia', class: 'cls-2', preTest: 68, postTest: 91 },
    { id: 'std-7', name: 'Yusuf Maulana', class: 'cls-3', preTest: 74, postTest: 92 },
    { id: 'std-8', name: 'Fatimah Azzahra', class: 'cls-3', preTest: 60, postTest: 82 },
    { id: 'std-9', name: 'Ibrahim Al Fatih', class: 'cls-3', preTest: 77, postTest: 95 },
    { id: 'std-10', name: 'Zainab Salsabila', class: 'cls-4', preTest: 69, postTest: 89 },
    { id: 'std-11', name: 'Umar Abdillah', class: 'cls-4', preTest: 63, postTest: 85 },
    { id: 'std-12', name: 'Maryam Qonita', class: 'cls-4', preTest: 72, postTest: 93 },
    { id: 'std-13', name: 'Hamzah Al Rasyid', class: 'cls-5', preTest: 66, postTest: 87 },
    { id: 'std-14', name: 'Ruqayyah Nabila', class: 'cls-5', preTest: 80, postTest: 97 },
    { id: 'std-15', name: 'Bilal Ramadhan', class: 'cls-5', preTest: 75, postTest: 94 },
    { id: 'std-16', name: 'Hafsah Salsabil', class: 'cls-6', preTest: 70, postTest: 90 },
    { id: 'std-17', name: 'Sa’id Nurdin', class: 'cls-6', preTest: 64, postTest: 83 },
    { id: 'std-18', name: 'Zahra Kamila', class: 'cls-6', preTest: 78, postTest: 96 },
  ]
  students.forEach(function (s) {
    appendRowObject(SHEET_NAMES.STUDENTS, s)
  })
  Logger.log('Seeded ' + students.length + ' students.')
}

function seedAttendance() {
  if (!isSheetEmpty(SHEET_NAMES.ATTENDANCE)) {
    Logger.log('Attendance already has data, skipping.')
    return
  }
  var meetings = ['Pertemuan 1', 'Pertemuan 2', 'Pertemuan 3', 'Pertemuan 4', 'Pertemuan 5']
  var statusCycle = [
    'Present', 'Present', 'Present', 'Present', 'Sick', 'Present',
    'Permission', 'Present', 'Present', 'Absent', 'Present', 'Present',
  ]
  var students = readAll(SHEET_NAMES.STUDENTS)
  var count = 0
  meetings.forEach(function (meeting, meetingIndex) {
    students.forEach(function (student, studentIndex) {
      var status = statusCycle[(studentIndex * 3 + meetingIndex * 5) % statusCycle.length]
      appendRowObject(SHEET_NAMES.ATTENDANCE, {
        studentId: student.id,
        meeting: meeting,
        status: status,
      })
      count++
    })
  })
  Logger.log('Seeded ' + count + ' attendance records.')
}

function seedUsers() {
  if (!isSheetEmpty(SHEET_NAMES.USERS)) {
    Logger.log('Users already has data, skipping.')
    return
  }
  ensurePlainPasswordColumn()

  var accounts = [
    { username: 'admin', role: ROLES.ADMIN, assignedClass: '' },
    { username: 'tutor.kelas7', role: ROLES.TUTOR, assignedClass: 'cls-1' },
  ]

  accounts.forEach(function (account) {
    var password = Utilities.getUuid().slice(0, 8)
    var salt = generateSalt()
    var user = {
      id: Utilities.getUuid(),
      username: account.username,
      password: hashPassword(password, salt),
      plainPassword: password,
      salt: salt,
      role: account.role,
      assignedClass: account.assignedClass,
    }
    appendRowObject(SHEET_NAMES.USERS, user)
    Logger.log(
      'Created ' + account.role + ' account -> username: ' + account.username +
      ' | password: ' + password + ' (shown once, save it now)',
    )
  })
}
