// State and perception rules for the first playable night. Independent of Three.js.
export const EVIDENCE = Object.freeze({
  photo: {
    title: 'Bức ảnh Polaroid ố vàng bên miệng giếng cổ (26/10/2008)',
    text: 'Ảnh chụp hai anh em Linh và An mặc áo mưa vàng đứng trước cổng nhà 41. Mặt sau bố viết vội bằng bút đỏ: “Nó trốn dưới giếng cổ sau nhà và chỉ truyền giọng qua dây điện. Nếu phải mở tủ điện, nhớ bật đúng thứ tự: ĐÈN HIÊN trước để trấn cửa, ĐÈN NGÕ thứ hai để soi đường rút, BÀN THỜ cuối cùng. Tuyệt đối không làm ngược!”',
    deduction: 'Quy tắc phá phong ấn Tủ Điện: Bật lần lượt [1. ĐÈN HIÊN] → [2. ĐÈN NGÕ] → [3. ĐÈN BÀN THỜ].'
  },
  marble: {
    title: 'Viên bi ve xanh nứt đôi & Dây chỉ đỏ trấn trạch',
    text: 'Viên bi xanh của An nằm cạnh bậu cửa sổ, bọc trong mảnh bùa giấy: “Thứ đứng sau cánh cửa đêm mưa năm 2008 không có bóng dưới đất. Nó nhại giọng em An hỏi câu bí mật của hai anh em để lừa con mở chốt. Hễ nghe tiếng gọi tên mình, hãy bấm XUNG ĐÈN PIN (Phím R) hoặc giữ im lặng lùi lại!”',
    deduction: 'Kẻ Bắt Chước dùng chính ký ức gia đình để dụ người sống mở lời. Không được trả lời tiếng gọi sau cửa!'
  },
  badge: {
    title: 'Phù hiệu học sinh cháy xém & Biên bản Trạm xá Phú Gia',
    text: 'Mẩu giấy viện phí đóng dấu đỏ lúc 19:41 đêm 26/10/2008: “Tiếp nhận một bé trai 7 tuổi ngạt nước mưa, chuyển gấp sang Trạm xá Phú Gia lúc mất điện toàn phường.” Vậy người em thật sự đã được cứu đi trong đêm đó — còn thứ vẫn gõ cửa nhà số 41 suốt 18 năm qua là Kẻ Bắt Chước dưới giếng cổ!',
    deduction: 'An chưa từng chết trong căn nhà này! Thứ đang giữ linh hồn ký ức của cậu bé là thực thể giả giọng trong ngõ.'
  }
});

export const NIGHT_ORDERS = Object.freeze([
  { customer: 'Bác bảo vệ · ca trực đêm mưa', request: 'Cho bác một gói Xôi xéo, thêm Hành phi cho ấm bụng nhé cháu. Đêm nay sấm chớp to quá.', base: 'Xôi xéo', topping: 'Hành phi', reply: 'Bác cảm ơn. Mà này Linh, lúc nãy đi ngang đầu Ngõ 41 bác thấy đèn đường chập chờn đỏ lòm, như có đứa trẻ mặc áo mưa vàng đứng nhìn về phía quán đấy…' },
  { customer: 'Người phụ nữ che ô đen · đứng khuất ngoài hiên', request: 'Gói gấp cho cô phần Xôi lạc với Muối vừng… Trước khi đồng hồ điểm 19 giờ 41 phút.', base: 'Xôi lạc', topping: 'Muối vừng', reply: 'Cô khách nhận gói xôi bằng bàn tay lạnh ngắt rồi chỉ vào chiếc máy in hóa đơn trên quầy: “Máy rút điện rồi kìa cháu… sao nó vẫn tự in ra chữ máu thế kia?”' },
  { customer: 'HÓA ĐƠN MỰC ĐỎ · NGUYỄN VĂN LINH (19:41)', request: 'Nếp trắng. Không hành, không muối vừng. Gói lá chuối đặt lên đĩa sứ trắng. Giao tới: NHÀ SỐ 41 NGÕ 41.', base: 'Nếp trắng', topping: 'Không thêm', reply: 'Từ khe máy in không cắm điện, một mảnh giấy ướt nước giếng cổ rơi ra: “Đừng trả lời tiếng gọi tên con. Dùng Xung Đèn Pin (Phím R) nếu cái bóng áo mưa vàng cản đường!”' }
]);

export function normalizeNight(input = {}) {
  return {
    orders: Math.max(0, Math.min(3, Math.floor(Number(input.orders) || 0))),
    evidence: [...new Set((Array.isArray(input.evidence) ? input.evidence : []).filter(id => typeof id === 'string' && Object.hasOwn(EVIDENCE, id)))],
    battery: Math.max(0, Math.min(100, Number.isFinite(input.battery) ? input.battery : 100)),
    composure: Math.max(0, Math.min(100, Number.isFinite(input.composure) ? input.composure : 100)),
    power: input.power === true,
    voiceAnswered: input.voiceAnswered === true,
    voiceEncountered: input.voiceEncountered === true,
    mistakes: Math.max(0, Math.floor(Number(input.mistakes) || 0))
  };
}

export function canResolveNight(night) {
  return Object.keys(EVIDENCE).every(id => night.evidence.includes(id)) && night.power && !night.voiceAnswered;
}

export function constrainNightPosition(position) {
  const areas = [
    { minX: -93.8, maxX: -86.2, minZ: -44.8, maxZ: -38.1 },
    { minX: -93.8, maxX: -64.7, minZ: -40.1, maxZ: -34.8 },
    { minX: -69.3, maxX: -64.7, minZ: -52, maxZ: -7.4 }
  ];
  if (areas.some(area => position.x >= area.minX && position.x <= area.maxX && position.z >= area.minZ && position.z <= area.maxZ)) return;
  let closest = null, distance = Infinity;
  for (const area of areas) {
    const candidate = { x: Math.max(area.minX, Math.min(position.x, area.maxX)), z: Math.max(area.minZ, Math.min(position.z, area.maxZ)) };
    const d = Math.hypot(position.x - candidate.x, position.z - candidate.z);
    if (d < distance) { closest = candidate; distance = d; }
  }
  position.x = closest.x;
  position.z = closest.z;
}

export const CIRCUIT_ORDER = Object.freeze(['porch', 'lane', 'altar']);
export function circuitStep(sequence, circuit) {
  const next = [...sequence, circuit];
  const correct = next.every((id, i) => CIRCUIT_ORDER[i] === id);
  return { sequence: correct ? next : [], tripped: !correct, complete: correct && next.length === 3 };
}

// Segment/AABB clipping: opaque walls block sight, including at their edges.
export function lineBlocked(a, b, boxes, padding = 0) {
  return boxes.some(box => {
    let low = 0;
    let high = 1;
    for (const [axis, minKey, maxKey] of [['x', 'minX', 'maxX'], ['z', 'minZ', 'maxZ']]) {
      const diff = b[axis] - a[axis];
      const min = box[minKey] - padding;
      const max = box[maxKey] + padding;
      if (Math.abs(diff) < 1e-8) {
        if (a[axis] < min || a[axis] > max) return false;
      } else {
        const first = (min - a[axis]) / diff;
        const second = (max - a[axis]) / diff;
        low = Math.max(low, Math.min(first, second));
        high = Math.min(high, Math.max(first, second));
        if (low > high) return false;
      }
    }
    return low <= high;
  });
}

export function createThreat() {
  return { mode: 'patrol', memory: 0, lastKnown: null, patrolIndex: 0, searchTime: 0 };
}

export function perceiveThreat(threat, { dt, position, player, light, noise, occluded, refuge = false }) {
  const distance = Math.hypot(player.x - position.x, player.z - position.z);
  const sees = !refuge && !occluded && distance < (light ? 18 : 5.5);
  const hears = !refuge && noise > 58 && distance < (occluded ? 9 : 16);
  if (sees || hears) {
    threat.mode = sees ? 'chase' : 'investigate';
    threat.lastKnown = { x: player.x, z: player.z };
    threat.memory = 3;
    threat.searchTime = 0;
  } else if (threat.lastKnown) {
    threat.memory = Math.max(0, threat.memory - dt);
    if (threat.memory === 0 || Math.hypot(position.x - threat.lastKnown.x, position.z - threat.lastKnown.z) < 0.7) {
      threat.mode = 'search';
      threat.searchTime += dt;
      if (threat.searchTime >= 5) {
        threat.mode = 'patrol';
        threat.lastKnown = null;
        threat.searchTime = 0;
      }
    }
  } else threat.mode = 'patrol';
  return { sees, hears, distance, mode: threat.mode };
}

// Small waypoint graph for the T-shaped alley. Edges are checked against world colliders.
export function nextRoutePoint(start, goal, nodes, boxes) {
  if (!lineBlocked(start, goal, boxes, 0.28)) return goal;
  const points = [start, ...nodes, goal];
  const costs = points.map(() => Infinity);
  const previous = points.map(() => -1);
  const visited = new Set();
  costs[0] = 0;
  for (let step = 0; step < points.length; step++) {
    let current = -1;
    for (let i = 0; i < points.length; i++) {
      if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    }
    if (current < 0 || !Number.isFinite(costs[current])) return start;
    if (current === points.length - 1) {
      let next = current;
      while (previous[next] > 0) next = previous[next];
      return points[next];
    }
    visited.add(current);
    for (let j = 1; j < points.length; j++) {
      if (visited.has(j) || lineBlocked(points[current], points[j], boxes, 0.28)) continue;
      const cost = costs[current] + Math.hypot(points[j].x - points[current].x, points[j].z - points[current].z);
      if (cost < costs[j]) { costs[j] = cost; previous[j] = current; }
    }
  }
  return start;
}
