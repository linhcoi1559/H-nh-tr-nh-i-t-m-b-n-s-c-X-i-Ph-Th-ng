export const MYSTERY_TITLE = 'Tấm ảnh trước cửa';
export const MYSTERY_CLUES = Object.freeze({
  back: { title: 'Mặt sau tấm ảnh', text: 'Bút chì ghi “Mai — trước cửa số 41”. Người phụ nữ cầm kéo, mặc áo có một hàng cúc lệch; trên cửa có hình bông sen. Không ghi tên phố hay năm chụp.' },
  tailor: { title: 'Đường may trên áo', text: 'Cô Liên: “Đó là tạp dề thợ may, không phải đồng phục. Mẹ tôi tên Mai, hay dùng kiểu cúc lệch ấy. Nhưng tôi chưa dám chắc địa chỉ trong ảnh.”' },
  water: { title: 'Số nhà đã đổi', text: 'Chú Bình: “Dãy bên đường đê từng đánh lại số. Cửa số 41 cũ là chỗ bà Mai nhận may vá, không phải trường học. Bà giữ một con dấu bông sen trên giấy nhận đồ.”' },
});
export const MYSTERY_ENDINGS = Object.freeze({
  named: { title: 'Có tên người kể', text: 'Bản sao ảnh được chú thích “Bà Mai — người thợ may ở cửa số 41 cũ”. Cô Liên góp lời kể về nghề của mẹ. Địa chỉ riêng và ghi chú mặt sau được giữ lại trong gia đình.' },
  anonymous: { title: 'Giữ lại một phần riêng tư', text: 'Bảng trong ngõ kể về nghề may qua một bản sao đã cắt thông tin riêng. Không ghi tên gia đình. Cô Liên giữ ảnh gốc; người đi ngang vẫn biết thêm về những người từng làm nghề trong phố.' },
  family: { title: 'Đưa ảnh về nhà', text: 'Tấm ảnh gốc trở về với cô Liên. Trong ngõ chỉ treo lời nhắn về nghề may, không treo ảnh hoặc tên gia đình. Cô Hoa dành một khung trống cho câu chuyện khác khi có người muốn chia sẻ.' },
});
export const MYSTERY_TARGETS = Object.freeze({
  archive: { id: 'archive', x: -75, z: -109.5, title: 'Hỏi bác Sơn tại hiệu sách Phú Xá' },
  tailor: { id: 'tailor', x: 48.5, z: -96, title: 'Đối chiếu đường may với cô Liên · Phú Gia' },
  water: { id: 'water', x: 27, z: -222, title: 'Hỏi chú Bình về số nhà cũ · đường đê' },
  consent: { id: 'consent', x: 48.5, z: -96, title: 'Hỏi cô Liên về cách sử dụng tấm ảnh' },
  finish: { id: 'finish', x: -52.5, z: -5.6, title: 'Mang lời nhắn về quán trà cô Hoa' },
});
export function normalizePhotoMystery(input = {}) {
  const clues = [...new Set((Array.isArray(input?.clues) ? input.clues : []).filter(id => Object.hasOwn(MYSTERY_CLUES,id)))];
  const started = input?.started === true;
  const deduced = started && clues.length === 3 && input?.deduced === true;
  const consent = deduced && input?.consent === true;
  const ending = consent && Object.hasOwn(MYSTERY_ENDINGS, input?.ending) ? input.ending : null;
  return { started, clues: started ? clues : [], deduced, consent, ending, suspended: started&&!ending&&input?.suspended===true };
}
export function startPhotoMystery(input) {
  const s = normalizePhotoMystery(input);
  return s.started ? s : { ...s, started: true };
}
export function mysteryTargets(input) {
  const s = normalizePhotoMystery(input);
  if (!s.started || s.ending || s.suspended) return [];
  if (!s.clues.includes('back')) return [MYSTERY_TARGETS.archive];
  if (!s.deduced) return ['tailor', 'water'].filter(id => !s.clues.includes(id)).map(id => MYSTERY_TARGETS[id]);
  return [s.consent ? MYSTERY_TARGETS.finish : MYSTERY_TARGETS.consent];
}
export function collectMysteryClue(input, id) {
  const s = normalizePhotoMystery(input);
  if (!s.started || s.ending || !Object.hasOwn(MYSTERY_CLUES,id) || s.clues.includes(id)) return s;
  if (id !== 'back' && !s.clues.includes('back')) return s;
  return { ...s, clues: [...s.clues, id] };
}
export function deduceMystery(input, answer) {
  const s = normalizePhotoMystery(input);
  if (!s.started || s.clues.length !== 3 || s.deduced) return { state: s, ok: false, feedback: 'Cần đọc mặt sau và đối chiếu cả hai lời kể trước.' };
  if (answer !== 'mai') return { state: s, ok: false, feedback: answer === 'school'
    ? 'Số 41 chưa đủ để kết luận là trường. Cô Liên đã nhận ra tạp dề; chú Bình nhắc việc đổi số nhà. Xem lại hai manh mối ấy.'
    : 'Chưa có manh mối nào cho thấy người trong ảnh là cô Hoa. Đối chiếu tên “Mai”, đường cúc áo và lời kể về số nhà cũ.' };
  return { state: { ...s, deduced: true }, ok: true, feedback: 'Các lời kể khớp: bà Mai, người thợ may ở cửa số 41 cũ bên đường đê. Hãy xin ý kiến gia đình trước khi công bố.' };
}
export function recordMysteryConsent(input) {
  const s = normalizePhotoMystery(input);
  return s.deduced && !s.ending ? { ...s, consent: true } : s;
}
export function finishPhotoMystery(input, choice) {
  const s = normalizePhotoMystery(input);
  if (!s.consent || s.ending || !Object.hasOwn(MYSTERY_ENDINGS, choice)) return { state: s, reward: null };
  return { state: { ...s, ending: choice }, reward: { coins: 0, xp: 150, points: 2 } };
}
export function mysteryHint(input) {
  const s = normalizePhotoMystery(input);
  if (!s.started) return 'Bác Sơn tìm người trong một tấm ảnh cũ. Mở N để nhận lời, không cần mua vật phẩm hoặc làm đủ việc ngày.';
  if (s.suspended) return 'Đang tạm gác điều tra. Manh mối được giữ; mở N để tiếp tục khi bạn muốn.';
  if (s.ending) return MYSTERY_ENDINGS[s.ending].text;
  if (s.clues.length === 3 && !s.deduced) return 'Đã có ba manh mối. Mở sổ trong N để đối chiếu và kết luận.';
  return mysteryTargets(s).map(g => g.title).join(' · ');
}
