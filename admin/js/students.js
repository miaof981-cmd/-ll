// 学生管理页面逻辑

let currentPage = 1;
const pageSize = 10;
let allStudents = [];
let filteredStudents = [];
let editingStudent = null;
let admissionLetterData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;

  const currentUser = Auth.getCurrentUser();
  document.getElementById('currentUser').textContent = currentUser.name;
  document.getElementById('currentRole').textContent = currentUser.role;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('确定要退出登录吗?')) {
      Auth.logout();
    }
  });

  // 搜索框回车搜索
  document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchStudents();
    }
  });

  loadStudents();
});

function loadStudents() {
  allStudents = Storage.getStudents();
  filteredStudents = allStudents;
  renderStudents();
}

function searchStudents() {
  const searchText = document.getElementById('searchInput').value.trim();
  
  if (!searchText) {
    filteredStudents = allStudents;
  } else {
    filteredStudents = Utils.searchFilter(allStudents, searchText, ['id', 'name', 'parentName', 'phone']);
  }
  
  currentPage = 1;
  renderStudents();
}

function renderStudents() {
  const paginatedData = Utils.paginate(filteredStudents, currentPage, pageSize);
  const tbody = document.getElementById('studentsTableBody');
  
  if (paginatedData.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-message">暂无学生数据</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = paginatedData.items.map(student => `
    <tr>
      <td>${student.id}</td>
      <td>${student.name}</td>
      <td>${student.gender || '-'}</td>
      <td>${student.age || '-'}</td>
      <td>${student.parentName}</td>
      <td>${student.phone}</td>
      <td>${Utils.formatDate(student.createdAt, 'YYYY-MM-DD')}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewRecords('${student.id}')">档案</button>
        <button class="btn btn-sm btn-secondary" onclick="editStudent('${student.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id}')">删除</button>
      </td>
    </tr>
  `).join('');
  
  renderPagination(paginatedData);
}

function renderPagination(data) {
  const container = document.getElementById('pagination');
  
  if (data.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <button onclick="changePage(${data.page - 1})" ${data.page === 1 ? 'disabled' : ''}>上一页</button>
    <span class="page-info">第 ${data.page} / ${data.totalPages} 页，共 ${data.total} 条</span>
    <button onclick="changePage(${data.page + 1})" ${data.page === data.totalPages ? 'disabled' : ''}>下一页</button>
  `;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderStudents();
}

function showAddStudentModal() {
  editingStudent = null;
  admissionLetterData = null;
  
  document.getElementById('modalTitle').textContent = '添加学生';
  document.getElementById('studentForm').reset();
  document.getElementById('studentId').value = '';
  document.getElementById('studentNumber').value = Utils.generateStudentId();
  document.getElementById('password').value = '123456';
  
  document.getElementById('admissionPreview').style.display = 'none';
  document.getElementById('admissionUploadBtn').style.display = 'flex';
  
  document.getElementById('studentModal').classList.add('active');
}

function editStudent(id) {
  editingStudent = Storage.getStudentById(id);
  if (!editingStudent) return;
  
  admissionLetterData = editingStudent.admissionLetter || null;
  
  document.getElementById('modalTitle').textContent = '编辑学生';
  document.getElementById('studentId').value = editingStudent.id;
  document.getElementById('studentNumber').value = editingStudent.id;
  document.getElementById('studentName').value = editingStudent.name;
  document.getElementById('gender').value = editingStudent.gender || '男';
  document.getElementById('age').value = editingStudent.age || '';
  document.getElementById('parentName').value = editingStudent.parentName;
  document.getElementById('phone').value = editingStudent.phone;
  document.getElementById('wechat').value = editingStudent.wechat || '';
  document.getElementById('password').value = editingStudent.password || '123456';
  
  if (admissionLetterData) {
    document.getElementById('admissionImage').src = admissionLetterData;
    document.getElementById('admissionPreview').style.display = 'block';
    document.getElementById('admissionUploadBtn').style.display = 'none';
  } else {
    document.getElementById('admissionPreview').style.display = 'none';
    document.getElementById('admissionUploadBtn').style.display = 'flex';
  }
  
  document.getElementById('studentModal').classList.add('active');
}

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('active');
  editingStudent = null;
  admissionLetterData = null;
}

function uploadAdmission(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  Utils.imageToBase64(file, (base64) => {
    admissionLetterData = base64;
    document.getElementById('admissionImage').src = base64;
    document.getElementById('admissionPreview').style.display = 'block';
    document.getElementById('admissionUploadBtn').style.display = 'none';
  });
}

function removeAdmission() {
  admissionLetterData = null;
  document.getElementById('admissionPreview').style.display = 'none';
  document.getElementById('admissionUploadBtn').style.display = 'flex';
}

function saveStudent() {
  const name = document.getElementById('studentName').value.trim();
  const parentName = document.getElementById('parentName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  
  if (!name || !parentName || !phone) {
    Utils.showToast('请填写必填项', 'error');
    return;
  }
  
  const studentData = {
    id: document.getElementById('studentId').value || Utils.generateStudentId(),
    name,
    gender: document.getElementById('gender').value,
    age: parseInt(document.getElementById('age').value) || null,
    parentName,
    phone,
    wechat: document.getElementById('wechat').value.trim(),
    password: document.getElementById('password').value || '123456',
    admissionLetter: admissionLetterData,
    createdAt: editingStudent ? editingStudent.createdAt : new Date().toISOString()
  };
  
  Storage.saveStudent(studentData);
  
  // 如果有录取通知书，添加到档案
  if (admissionLetterData && !editingStudent) {
    Storage.addRecord(studentData.id, {
      type: 'admission',
      title: '录取通知书',
      image: admissionLetterData,
      description: '学生录取通知书'
    });
  }
  
  Utils.showToast(editingStudent ? '学生信息已更新' : '学生添加成功', 'success');
  closeStudentModal();
  loadStudents();
}

function deleteStudent(id) {
  Utils.confirm('确定要删除该学生吗？删除后将无法恢复！', () => {
    Storage.deleteStudent(id);
    Utils.showToast('学生已删除', 'success');
    loadStudents();
  });
}

function viewRecords(studentId) {
  const student = Storage.getStudentById(studentId);
  const records = Storage.getRecords(studentId);
  
  if (!student) return;
  
  const content = document.getElementById('recordsContent');
  
  if (records.length === 0) {
    content.innerHTML = '<p class="empty-message">该学生暂无档案记录</p>';
  } else {
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3>${student.name} (${student.id})</h3>
        <p style="color: var(--text-secondary);">家长: ${student.parentName} | 电话: ${student.phone}</p>
      </div>
      <div style="display: grid; gap: 16px;">
        ${records.map(record => `
          <div class="card" style="padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div>
                <h4 style="margin-bottom: 4px;">${record.title}</h4>
                <small style="color: var(--text-tertiary);">${Utils.formatDate(record.createdAt)}</small>
              </div>
              <span class="status-badge ${record.type === 'admission' ? 'status-completed' : record.type === 'punishment' ? 'status-cancelled' : 'status-processing'}">
                ${record.type === 'admission' ? '录取通知' : record.type === 'grade' ? '成绩单' : record.type === 'punishment' ? '处分单' : '图片档案'}
              </span>
            </div>
            ${record.image ? `<img src="${record.image}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;">` : ''}
            ${record.description ? `<p style="color: var(--text-secondary);">${record.description}</p>` : ''}
            ${record.score ? `<p><strong>分数:</strong> ${record.score}</p>` : ''}
            ${record.reason ? `<p><strong>原因:</strong> ${record.reason}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
  
  document.getElementById('recordsModal').classList.add('active');
}

function closeRecordsModal() {
  document.getElementById('recordsModal').classList.remove('active');
}

function exportStudents() {
  const data = allStudents.map(s => ({
    '学号': s.id,
    '姓名': s.name,
    '性别': s.gender || '',
    '年龄': s.age || '',
    '家长姓名': s.parentName,
    '联系电话': s.phone,
    '微信号': s.wechat || '',
    '创建时间': Utils.formatDate(s.createdAt)
  }));
  
  Utils.exportToCSV(data, '学生列表');
}

