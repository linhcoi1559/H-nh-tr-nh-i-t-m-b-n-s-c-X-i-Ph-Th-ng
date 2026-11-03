export const NEIGHBORHOOD_JOBS=[
 {id:'market-helper',title:'Phụ sạp rau chợ phiên',icon:'🥬',kind:'care',base:24000,
  story:'Sạp rau ven sông cần người kiểm hàng, phân loại rau héo rồi ghi đơn cho khách. Tới chợ, làm đúng ba bước; không có đồng hồ đếm ngược.',
  goals:[
   {id:'market-check',x:305,z:-73,title:'Kiểm hàng tại sạp rau',action:'care',condition:'Hai rổ rau vừa giao: một rổ còn tươi, một rổ có lá dập. Kiểm hàng trước khi bán.',options:['Trộn cả hai rổ','Tách lá dập, giữ riêng rau tươi','Tưới ngập hai rổ'],answer:1},
   {id:'market-pack',x:305,z:-73,title:'Gói đơn rau cho khách',action:'care',condition:'Khách mua rau tươi để nấu canh. Dùng rổ đã kiểm và túi giấy trên bàn.',options:['Gói rau tươi, tránh ép nát','Gói cả lá dập','Buộc chặt cho rau dập xuống'],answer:0},
   {id:'market-ledger',x:305,z:-73,title:'Bàn giao sổ bán hàng',action:'care',condition:'Một túi rau đã giao, khách đã trả tiền. Ghi đúng vào sổ rồi trả sạp.',options:['Ghi hai túi','Bỏ qua ghi sổ','Ghi một túi đã giao và đã thanh toán'],answer:2}]},
 {id:'bench-repair',title:'Sửa ghế nghỉ Phú Xá',icon:'🔧',kind:'care',base:26000,
  story:'Bác trông sân báo một thanh ghế bị lỏng. Mượn đồ nghề, kiểm tra chân ghế rồi sửa và thử lại trước khi mở cho mọi người ngồi.',
  goals:[
   {id:'bench-inspect',x:-159,z:-117,title:'Kiểm tra ghế tại sân Phú Xá',action:'care',condition:'Thanh ghế lắc khi tỳ tay. Hai bu lông bên dưới bị lỏng; gỗ chưa gãy.',options:['Thay cả chiếc ghế','Kiểm tra đúng hai bu lông lỏng','Sơn che vết nối'],answer:1},
   {id:'bench-tighten',x:-159,z:-117,title:'Siết lại thanh ghế',action:'care',condition:'Chọn dụng cụ vừa đầu bu lông, siết lần lượt hai bên để thanh ghế cân.',options:['Dùng cờ lê vừa cỡ, siết đều','Dùng tay kéo mạnh thanh gỗ','Đóng đinh xuyên mặt ghế'],answer:0},
   {id:'bench-test',x:-159,z:-117,title:'Thử ghế và cất dụng cụ',action:'care',condition:'Hai bu lông đã chặt. Cần bảo đảm ghế không rung và không còn dụng cụ trên lối đi.',options:['Bỏ dụng cụ tại ghế','Rời sân ngay','Tỳ thử, kiểm tra rồi cất đồ nghề'],answer:2}]},
 {id:'river-greens',title:'Giao rau một vòng khu phố',icon:'🧺',kind:'care',base:32000,
  story:'Quầy chợ nhờ chuyển rau tới quán nước trên đường đê. Nhận rổ trước, giao đúng đơn rồi mang rổ không về chợ.',
  goals:[
   {id:'greens-pickup',x:305,z:-73,title:'Nhận rổ rau tại chợ phiên',action:'care',condition:'Đơn của quán nước chú Bình: một rổ rau tươi. Đọc nhãn trước khi nhận.',options:['Nhận rổ ghi Quán chú Bình','Nhận rổ bất kỳ','Chưa kiểm đã ký'],answer:0},
   {id:'greens-deliver',x:27,z:-222,title:'Giao rau cho quán nước chú Bình',action:'care',condition:'Đã tới quán chú Bình. Chủ quán nhận rau và trả lại rổ tre rỗng.',options:['Để cả rổ ở đường','Đối chiếu đơn, giao rau và nhận rổ rỗng','Giao sang nhà bên cạnh'],answer:1},
   {id:'greens-return',x:305,z:-73,title:'Trả rổ tre về chợ phiên',action:'care',condition:'Rổ đã được trả về quầy. Kiểm tra rổ không hỏng và bàn giao để kết thúc chuyến.',options:['Giữ rổ làm của riêng','Bỏ rổ ngoài đường','Trả rổ, xác nhận đã giao đủ'],answer:2}]}
];

const care=(id,x,z,title,condition,options,answer)=>({id,x,z,title,action:'care',condition,options,answer});
const play=(id,x,z,title,game)=>({id,x,z,title,action:'leisure',game});
NEIGHBORHOOD_JOBS.push(
 {id:'tea-service',title:'Một ca trà đá vườn tre',icon:'🍵',kind:'care',base:22000,
 story:'Ghé quán vườn tre, rửa cốc rồi pha đúng đơn của khách. Đọc công thức và tự thêm từng nguyên liệu; không ép thời gian.',goals:[
 care('tea-wash',266,-231,'Chuẩn bị bàn trà vườn tre','Cốc vừa trả lại còn bã trà. Chuẩn bị trước khi pha.', ['Tráng rửa cốc, dùng nước sạch','Đổ trà mới lên bã cũ','Chỉ lau bên ngoài'],0),
 play('tea-mix',266,-231,'Pha trà theo đơn của khách','tea'),
 care('tea-clear',266,-231,'Thu dọn sau ca trà','Khách đã dùng xong. Trả lại bàn sạch và lối đi thoáng.', ['Để cốc trên ghế','Thu cốc và lau bàn','Đổ bã ra lối đi'],1)]},
 {id:'flower-arranging',title:'Bó hoa gửi người hàng xóm',icon:'💐',kind:'care',base:25000,
 story:'Sạp hoa chợ phiên nhận một đơn bó hoa. Chọn hoa theo mẫu, gói xong rồi gửi tặng bác trông sân Phú Xá.',goals:[
 play('flowers-compose',307,-73,'Cắm bó hoa theo mẫu tại chợ phiên','flowers'),
 care('flowers-wrap',307,-73,'Gói bó hoa','Bó hoa đã đủ mẫu. Cần giữ cành không gãy trong chuyến đi.', ['Ép sát cánh hoa','Cuộn lá vào trong cánh','Bọc gốc, buộc vừa tay'],2),
 care('flowers-give',-159,-117,'Trao hoa tại sân Phú Xá','Lời nhắn trên đơn: gửi bác trông sân, cảm ơn đã chăm ghế nghỉ.', ['Đọc lời nhắn rồi trao tận tay','Đặt giữa đường','Giữ lại bó hoa'],0)]},
 {id:'bicycle-help',title:'Giúp bác bơm xe đạp',icon:'🚲',kind:'care',base:20000,
 story:'Xe đạp tại sân Phú Xá bị non hơi. Kiểm tra van, bơm từng nhịp và xả bớt nếu quá áp; đồng hồ có vùng xanh dễ nhìn.',goals:[
 care('bike-valve',-159,-117,'Kiểm tra van xe đạp','Lốp non, không có vết rách; đầu van còn nắp.', ['Bơm qua nắp van','Tháo nắp, nối đầu bơm chắc','Bơm thật nhanh ngay'],1),
 play('bike-pump',-159,-117,'Bơm lốp và kiểm tra đồng hồ','pump'),
 care('bike-ready',-159,-117,'Bàn giao xe đạp','Áp suất đã đúng. Bác cần xe an toàn để đi chợ.', ['Tháo bơm, đậy van, thử bánh và phanh','Để dây bơm gắn ở bánh','Chỉ lau yên'],0)]},
 {id:'river-fishing',title:'Buổi câu thư giãn ven sông',icon:'🎣',kind:'care',base:18000,
 story:'Mượn cần tại sân ngắm sông. Nhấc cần khi phao vào vùng xanh, câu và thả ba con rồi thu đồ. Nhịp chậm, trượt không mất tiền.',goals:[
 care('fishing-ready',372,-156,'Mượn cần tại sân ngắm sông','Khu câu nằm sau lan can; luôn đứng phía trong sân.', ['Trèo qua lan can','Thả dây chắn lối','Kiểm tra cần, đứng trong lan can'],2),
 play('fishing-catch',372,-156,'Câu và thả ba con cá','fishing'),
 care('fishing-clean',372,-156,'Thu cần và dọn chỗ câu','Buổi câu kết thúc. Không để dây hoặc lưỡi câu trên sân.', ['Thu dây, cất cần, nhặt bao bì','Bỏ dây bên ghế','Để mồi xuống nước'],0)]},
 {id:'lost-property',title:'Chiếc túi ai để quên',icon:'👜',kind:'care',base:24000,
 story:'Quán nước đường đê giữ một túi vải bị bỏ quên. Hỏi người nhận ở chợ, đối chiếu đặc điểm rồi quay về báo đã trả; không đoán mò.',goals:[
 care('lost-note',27,-222,'Đọc lời nhắn đồ thất lạc','Chú Bình ghi: túi vải xanh, quai vá chỉ đỏ, bên trong có sổ trồng cây. Chủ thường bán cây tại chợ.', ['Nhớ túi xanh, quai chỉ đỏ, sổ trồng cây','Chỉ nhớ màu xanh','Mở lấy đồ trong túi'],0),
 care('lost-match',305,-73,'Tìm chủ túi tại chợ phiên','Ba người nhận là chủ túi. Đối chiếu đủ đặc điểm trong lời nhắn.', ['Túi xanh, quai mới, có sách học','Túi xanh, quai chỉ đỏ, có sổ trồng cây','Túi đỏ, quai xanh, có ví'],1),
 care('lost-return',27,-222,'Báo lại cho chú Bình','Chủ túi đã nhận đủ đồ và gửi lời cảm ơn.', ['Nhận thêm một túi khác','Không nói gì','Xác nhận đã trả đúng chủ, đủ đồ'],2)]}
);
