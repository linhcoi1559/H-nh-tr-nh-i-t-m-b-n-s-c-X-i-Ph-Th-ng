const KINDS = ['delivery', 'cleanup', 'album', 'courier'];
export const STORY_TITLE = 'Giữ một góc ngõ';

export function normalizeNeighborhoodStory(input = {}) {
  return {
    helped: [...new Set((Array.isArray(input?.helped) ? input.helped : []).filter(kind => KINDS.includes(kind)))],
    ending: ['green', 'heritage'].includes(input?.ending) ? input.ending : null,
  };
}

export function recordNeighborhoodHelp(story, kind) {
  const result = normalizeNeighborhoodStory(story);
  if (KINDS.includes(kind) && !result.helped.includes(kind)) result.helped.push(kind);
  return result;
}

export function neighborhoodChapter(story) {
  const s = normalizeNeighborhoodStory(story);
  const count = s.helped.length;
  if (s.ending) return { stage: 'finished', title: 'Một góc ngõ có người chăm',
    text: s.ending === 'green'
      ? 'Cô Hoa: “Mấy chậu cây đã có chỗ. Bà con nhận nhau tưới mỗi sáng; từ nay ngõ này có người chăm.”'
      : 'Bác Sơn: “Ảnh của người ở đây được treo lên rồi. Ai đi ngang cũng có thể kể thêm một chuyện của mình.”',
    objective: 'Ghé Ngõ 41 xem công trình; tiếp tục góp điểm để hoàn thiện nó.', progress: count };
  if (count >= 3) return { stage: 'decision', title: 'Dùng góc ngõ vào việc gì?',
    text: 'Cô Hoa giữ được một khoảng nhỏ trong Ngõ 41. Bà con đã góp vật liệu: làm chỗ đặt cây hay dựng bảng ảnh của cư dân? Chưa đủ chỗ làm cả hai ngay. Bạn là người đi giúp mọi nhà, hãy chọn việc khởi đầu.',
    objective: 'Chọn công trình đầu tiên cho góc ngõ. Lựa chọn sẽ được giữ qua các ngày.', progress: count };
  if (count >= 1) return { stage: 'connections', title: 'Mỗi nhà góp một tay',
    text: 'Cô Hoa: “Một mình cô không lo hết được. Người bán xôi góp tiền, người dọn lối đi góp công, nhóm ảnh giữ chuyện cũ, bưu tá nối các hộ ngoài phố. Giúp thêm những nhóm khác rồi mình bàn chuyện góc ngõ.”',
    objective: `Đã giúp ${count}/3 nhóm khác nhau. Chọn loại việc chưa làm; lặp lại một loại không tăng tiến độ câu chuyện.`, progress: count };
  return { stage: 'introduction', title: 'Khoảng trống sau quán trà',
    text: 'Cô Hoa muốn dọn khoảng nhỏ trong Ngõ 41 thành nơi bà con dừng chân. Quỹ chưa có, cũng chưa ai đứng ra. Cô nhờ bạn bắt đầu bằng một việc cho khu phố rồi quay lại bàn tiếp.',
    objective: 'Hoàn thành một việc trong ngày và nhận thưởng. Câu chuyện không giới hạn thời gian.', progress: 0 };
}

export function chooseNeighborhoodEnding(state, choice) {
  const story = normalizeNeighborhoodStory(state.story);
  if (story.ending || story.helped.length < 3 || !['green', 'heritage'].includes(choice)) return state;
  // This chapter contributes one construction level, not an endlessly
  // repeatable cash payout. The other branch remains buildable later.
  return { ...state, story: { ...story, ending: choice },
    projects: { ...state.projects, [choice]: Math.min(3, state.projects[choice] + 1) } };
}
