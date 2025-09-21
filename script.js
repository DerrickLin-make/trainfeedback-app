// DOM元素获取
const form = document.getElementById('feedbackForm');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const copyBtn = document.getElementById('copyBtn');

// --- 动态多动作行 ---
const setsContainer = document.getElementById('setsContainer');
const addRowBtn = document.getElementById('addRowBtn');

function createSetRow() {
  const row = document.createElement('div');
  row.className = 'set-row';
  row.innerHTML = `
      <select name="movementSelect[]">
        <option value="">从常见动作中选择</option>
        <option>深蹲</option>
        <option>硬拉</option>
        <option>卧推</option>
        <option>推举</option>
        <option>划船</option>
        <option>引体向上</option>
        <option>弓步蹲</option>
        <option>俯卧撑</option>
      </select>
      <span class="or">或</span>
      <input type="text" name="movementText[]" placeholder="自定义动作名称">
      <input type="number" name="sets[]" min="1" step="1" placeholder="组数" required>
      <input type="number" name="reps[]" min="1" step="1" placeholder="次数" required>
      <input type="number" name="weight[]" min="0" step="0.5" placeholder="重量/负重 (kg)">
      <button type="button" class="row-remove" aria-label="删除此行">删除</button>
  `;
  // 绑定删除
  row.querySelector('.row-remove').addEventListener('click', () => {
    row.remove();
    ensureAtLeastOneRow();
  });
  return row;
}

function ensureAtLeastOneRow(){
  if (setsContainer.children.length === 0) {
    setsContainer.appendChild(createSetRow());
  }
}

addRowBtn.addEventListener('click', () => {
  setsContainer.appendChild(createSetRow());
});

// 初始化至少一行
ensureAtLeastOneRow();

// 表单提交处理（无延迟，直接生成结果）
form.addEventListener('submit', function(e) {
  e.preventDefault();

  const data = collectFormData();
  const feedback = generateFeedback(data);
  showResult(feedback);
});

function collectFormData(){
  const formData = new FormData(form);
  // 收集多行完成情况
  const rows = Array.from(setsContainer.querySelectorAll('.set-row'));
  const items = rows.map((row, idx) => {
    const movementText = row.querySelector('input[name="movementText[]"]').value.trim();
    const movementSelect = row.querySelector('select[name="movementSelect[]"]').value.trim();
    const sets = row.querySelector('input[name="sets[]"]').value;
    const reps = row.querySelector('input[name="reps[]"]').value;
    const weight = row.querySelector('input[name="weight[]"]').value;
    return {
      movement: movementText || movementSelect || `动作${idx+1}`,
      sets: sets ? Number(sets) : null,
      reps: reps ? Number(reps) : null,
      weight: weight ? Number(weight) : null,
    };
  }).filter(item => item.movement);

  const plain = Object.fromEntries(formData.entries());
  return { ...plain, items };
}

// 生成反馈文字（不包含综合建议）
function generateFeedback(data) {
  const date = formatDate(data.date);
  const rpe = data.rpe; // 原样输出
  const energy = data.energy; // 原样输出
  const sleep = data.sleep; // 原样输出（好/一般/差）
  const sleepDuration = data['sleep-duration']; // 数值，原样输出
  const muscleSoreness = data['muscle-soreness']; // 原样输出（文本，严禁修改）
  const otherFactors = data['other-factors'];

  let feedback = `训练反馈 - ${date}\n\n`;

  // 完成情况（多条）
  feedback += `完成情况：\n`;
  if (Array.isArray(data.items) && data.items.length){
    data.items.forEach((it, i) => {
      const lines = [
        `  ${i+1}. 动作：${it.movement}`,
        it.sets ? `     组数：${it.sets} 组` : '',
        it.reps ? `     次数：每组 ${it.reps} 次` : '',
        (it.weight || it.weight === 0) ? `     重量/负重：${it.weight} kg` : '',
      ].filter(Boolean);
      feedback += lines.join('\n') + '\n';
    });
  } else {
    feedback += `  未填写动作记录\n`;
  }
  feedback += `\n`;

  // RPE评估（原样输出）
  feedback += `RPE评估：\n${rpe}\n\n`;

  // 能量水平（原样输出）
  feedback += `能量水平：\n${energy}\n\n`;

  // 睡眠质量（原样输出）
  feedback += `睡眠质量：\n${sleep}\n\n`;

  // 新增：睡眠时长（数值，原样输出）
  if (sleepDuration !== undefined) {
    feedback += `睡眠时长：\n${sleepDuration}\n\n`;
  }

  // 肌肉酸痛（严格原样输出）
  feedback += `肌肉酸痛：\n${data['muscle-soreness'] ?? ''}\n\n`;

  // 其他因素
  feedback += `其他因素：\n`;
  feedback += otherFactors && otherFactors.trim() ? `${otherFactors.trim()}\n` : `无\n`;

  return feedback;
}

// 其余分析函数与工具函数（与此前一致）
function getRPEAnalysis(rpe) {
  if (!Number.isFinite(rpe)) return '请确保RPE在1-10范围内。';
  if (rpe <= 4) return '训练强度较轻，作为恢复或技术练习较为合适。可在状态良好时逐步提升强度。';
  if (rpe <= 6) return '训练强度中等，刺激适中，可视目标逐步递增负荷。';
  if (rpe <= 8) return '训练强度偏高，能带来良好适应。注意控制总量与恢复。';
  if (rpe <= 9) return '训练强度很高，已接近极限。请确保充分热身与恢复。';
  return '极限强度训练（RPE 10）。务必安排充足的恢复，避免连续多次极限训练。';
}

function getEnergyAnalysis(score) {
  if (!Number.isFinite(score)) return '请确保能量水平在1-10范围内。';
  if (score <= 3) return '能量水平较低，可能影响训练表现。建议关注饮食、睡眠与压力管理。';
  if (score <= 6) return '能量水平一般，基本可完成训练。可通过加餐或调整作息进一步提升。';
  if (score <= 8) return '能量水平良好，适合进行计划中的训练负荷。';
  return '能量水平充沛，可在安全前提下尝试小幅提高训练强度或容量。';
}

function getSleepAnalysis(sleep) {
  const sleepMap = {
    'poor': '睡眠质量不佳可能影响了恢复和表现。建议优化睡眠环境，建立规律作息，必要时咨询专业人士。',
    'average': '睡眠质量一般，有改善空间。尝试提前30分钟入睡，创造更好的睡眠环境。',
    'good': '睡眠质量良好，为训练和恢复提供了良好基础。继续保持规律的睡眠习惯。'
  };
  return sleepMap[sleep] || '充足的睡眠是训练恢复的关键因素。';
}

function getMuscleSorenessAnalysis(soreness) {
  const sorenessMap = {
    'none': '无肌肉酸痛，恢复状态良好。可以按计划进行下次训练。',
    'mild': '轻微肌肉酸痛属于正常现象，表明肌肉得到了适当刺激。注意拉伸和轻度活动促进恢复。',
    'moderate': '中度肌肉酸痛，需要关注恢复质量。建议增加拉伸、按摩或轻度有氧运动来缓解。',
    'severe': '严重肌肉酸痛可能提示训练强度过大或恢复不足。建议降低下次训练强度，加强恢复措施。'
  };
  return sorenessMap[soreness] || '请关注肌肉酸痛程度，适当调整训练计划。';
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (isNaN(date)) return dateString || '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const w = weekdays[date.getDay()];
  return `${y}-${m}-${d} ${w}`;
}

function showResult(feedback) {
  resultContent.textContent = feedback;
  resultSection.style.display = 'block';
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function selectText(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

// 复制功能
copyBtn.addEventListener('click', function() {
  const text = resultContent.textContent;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = '已复制';
    copyBtn.classList.add('copied');
    setTimeout(() => { copyBtn.textContent = '复制'; copyBtn.classList.remove('copied'); }, 2000);
  }).catch(() => selectText(resultContent));
});

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
  // 设置默认日期为今天
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
});