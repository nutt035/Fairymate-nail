// 📂 utils/lineService.ts

// --- 1. ฟังก์ชันส่งข้อความ (ยิงไปหลังบ้าน) ---
export const sendLineMessage = async (messageObject: any) => {
  try {
    // messageObject ตอนนี้จะเป็นโครงสร้าง Flex Message ทั้งก้อน
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageObject }), 
    });

    if (!response.ok) throw new Error('ส่ง LINE ไม่ผ่าน');
    return true;
  } catch (error) {
    console.error(error);
    alert('❌ เกิดข้อผิดพลาดในการส่ง LINE');
    return false;
  }
};


// ✅ แก้ไขอันนี้: ฟังก์ชันสร้างการ์ดเปิดร้าน (แบบแสดงรายละเอียดคิว)
export const generateOpenShopFlex = (bookings: any[], estimatedIncome: number) => {
  const dateStr = new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' });

  // 1. วนลูปสร้างแถวรายชื่อลูกค้า
  const bookingRows = bookings.length > 0 
    ? bookings.map((b) => ({
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": b.start_time.slice(0,5), "size": "sm", "color": "#06C755", "weight": "bold", "flex": 2 }, // เวลา
          { "type": "text", "text": b.customer_name, "size": "sm", "color": "#111111", "flex": 4, "wrap": true }, // ชื่อ
          { "type": "text", "text": b.services?.name || '-', "size": "xs", "color": "#999999", "align": "end", "flex": 3 } // บริการ
        ]
      }))
    : [
        { "type": "text", "text": "(วันนี้ยังไม่มีคิวจอง)", "size": "sm", "color": "#aaaaaa", "align": "center", "margin": "md" }
      ];

  // 2. ประกอบร่าง Flex Message
  return {
    "type": "flex",
    "altText": `📋 ตารางงานวันนี้: ${dateStr}`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          { "type": "text", "text": "TODAY'S QUEUE", "color": "#ffffff", "weight": "bold", "size": "sm" },
          { "type": "text", "text": "ตารางงานวันนี้", "color": "#ffffff", "weight": "bold", "size": "xl", "margin": "md" },
          { "type": "text", "text": `📅 ${dateStr}`, "color": "#ffffffcc", "size": "xs", "margin": "sm" }
        ],
        "backgroundColor": "#06C755",
        "paddingAll": "20px"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
           // หัวตาราง
           {
            "type": "box", "layout": "horizontal",
            "contents": [
               { "type": "text", "text": "เวลา", "size": "xs", "color": "#aaaaaa", "flex": 2 },
               { "type": "text", "text": "ลูกค้า", "size": "xs", "color": "#aaaaaa", "flex": 4 },
               { "type": "text", "text": "บริการ", "size": "xs", "color": "#aaaaaa", "align": "end", "flex": 3 }
            ]
           },
           { "type": "separator", "margin": "sm" },
           
           // --- รายชื่อลูกค้าจะโผล่ตรงนี้ ---
           ...bookingRows, 
           // ----------------------------

           { "type": "separator", "margin": "lg" },
           
           // สรุปท้ายตาราง
           {
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
              { "type": "text", "text": "รวมทั้งหมด", "size": "sm", "color": "#555555" },
              { "type": "text", "text": `${bookings.length} คิว`, "size": "sm", "color": "#111111", "weight": "bold", "align": "end" }
            ]
           },
           {
            "type": "box", "layout": "horizontal", "margin": "sm",
            "contents": [
              { "type": "text", "text": "ยอดคาดการณ์", "size": "sm", "color": "#555555" },
              { "type": "text", "text": `฿${estimatedIncome.toLocaleString()}`, "size": "sm", "color": "#06C755", "weight": "bold", "align": "end" }
            ]
           }
        ],
        "paddingAll": "20px"
      }
    }
  };
};

// ฟังก์ชันสร้างการ์ด "ปิดร้าน" (แก้ไขแล้ว ✅)
export const generateCloseShopFlex = (actualIncome: number, doneCount: number, cancelCount: number) => {
  const dateStr = new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' });

  return {
    "type": "flex",
    "altText": `🔴 ปิดร้านแล้ว: ${dateStr}`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          { "type": "text", "text": "CLOSE SHOP", "color": "#ffffff", "weight": "bold", "size": "sm" },
          { "type": "text", "text": "สรุปยอดปิดร้าน", "color": "#ffffff", "weight": "bold", "size": "xl", "margin": "md" },
          { "type": "text", "text": `📅 ประจำวันที่ ${dateStr}`, "color": "#ffffffcc", "size": "xs", "margin": "sm" }
        ],
        "backgroundColor": "#EF4444",
        "paddingAll": "20px"
      },
      "body": {
        "type": "box", "layout": "vertical",
        "contents": [
          {
            "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "cornerRadius": "md", "paddingAll": "lg",
            "contents": [
               { "type": "text", "text": "💰 ยอดเงินเข้าจริง (สุทธิ)", "size": "sm", "color": "#EF4444", "align": "center" },
               { "type": "text", "text": `฿${actualIncome.toLocaleString()}`, "size": "xxl", "color": "#EF4444", "weight": "bold", "align": "center", "margin": "sm" }
            ]
          },
          {
            "type": "box", "layout": "horizontal", "margin": "xl",
            "contents": [
              { "type": "text", "text": "✅ ทำสำเร็จ", "size": "sm", "color": "#555555", "flex": 1 },
              { "type": "text", "text": `${doneCount} คน`, "size": "sm", "color": "#111111", "weight": "bold", "align": "end" }
            ]
          },
          {
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
              { "type": "text", "text": "❌ ยกเลิก/ไม่มา", "size": "sm", "color": "#555555", "flex": 1 },
              { "type": "text", "text": `${cancelCount} คน`, "size": "sm", "color": "#111111", "weight": "bold", "align": "end" }
            ]
          }
        ],
        "paddingAll": "20px"
      },
      "footer": {
        "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2",
        "contents": [
           { "type": "text", "text": "💤 พักผ่อนเยอะๆ เจอกันพรุ่งนี้ครับ", "size": "xs", "color": "#EF4444", "align": "center" }
        ],
        "paddingAll": "10px"
      }
    }
  };
};

// ... (ต่อจากของเดิม)

// ✅ ฟังก์ชันสร้างการ์ด "เตือนใกล้ถึงคิว" (สีส้ม)
export const generateWarningFlex = (customerName: string, time: string, serviceName: string) => {
  return {
    "type": "flex",
    "altText": `⚠️ อีก 30 นาที: คิวคุณ ${customerName}`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          { "type": "text", "text": "UPCOMING QUEUE", "color": "#ffffff", "weight": "bold", "size": "sm" },
          { "type": "text", "text": "อีก 30 นาทีถึงคิว", "color": "#ffffff", "weight": "bold", "size": "xl", "margin": "md" }
        ],
        "backgroundColor": "#F59E0B", // สีส้ม
        "paddingAll": "20px"
      },
      "body": {
        "type": "box", "layout": "vertical",
        "contents": [
          {
            "type": "box", "layout": "vertical", "backgroundColor": "#FFFBEB", "cornerRadius": "md", "paddingAll": "lg",
            "contents": [
               { "type": "text", "text": time, "size": "xxl", "color": "#F59E0B", "weight": "bold", "align": "center" },
               { "type": "text", "text": "เวลาเริ่มให้บริการ", "size": "xs", "color": "#B45309", "align": "center", "margin": "sm" }
            ]
          },
          {
            "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm",
            "contents": [
              {
                "type": "box", "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                  { "type": "text", "text": customerName, "wrap": true, "color": "#666666", "size": "sm", "flex": 4, "weight": "bold" }
                ]
              },
              {
                "type": "box", "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "บริการ", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                  { "type": "text", "text": serviceName, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                ]
              }
            ]
          }
        ],
        "paddingAll": "20px"
      }
    }
  };
};