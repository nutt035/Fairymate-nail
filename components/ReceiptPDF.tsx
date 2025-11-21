import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// 1. ลงทะเบียน Font ภาษาไทย (ดึงจาก Google Fonts)
Font.register({
  family: 'Sarabun',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/sarabun/files/sarabun-thai-400-normal.woff'
});

Font.register({
  family: 'SarabunBold',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/sarabun/files/sarabun-thai-700-normal.woff'
});

// 2. สร้าง Style (เหมือน CSS แต่เขียนแบบ JS)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    padding: 20,
    fontSize: 12,
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'dashed',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'SarabunBold',
    marginBottom: 5,
  },
  info: {
    fontSize: 10,
    marginBottom: 15,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'dashed',
  },
  totalText: {
    fontSize: 14,
    fontFamily: 'SarabunBold',
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#888',
  }
});

// 3. ตัว Component ใบเสร็จ
export const ReceiptDoc = ({ item }: { item: any }) => {
  const price = item.services?.price || 0;
  const discount = item.discount || 0;
  const total = price - discount;
  const dateStr = new Date(item.booking_date).toLocaleDateString('th-TH');

  return (
    <Document>
      {/* ใช้ขนาด A6 (เหมือนใบเสร็จใบเล็ก) */}
      <Page size="A6" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Fairymate Nail</Text>
          <Text>ใบเสร็จรับเงิน / Receipt</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text>วันที่: {dateStr} | เวลา: {item.start_time.slice(0, 5)}</Text>
          <Text>ลูกค้า: {item.customer_name}</Text>
        </View>

        {/* Items */}
        <View style={styles.row}>
          <Text>{item.services?.name}</Text>
          <Text>{price.toLocaleString()}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.row}>
            <Text style={{ color: 'red' }}>ส่วนลด</Text>
            <Text style={{ color: 'red' }}>-{discount.toLocaleString()}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>ยอดสุทธิ</Text>
          <Text style={styles.totalText}>฿{total.toLocaleString()}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>ขอบคุณที่ใช้บริการ</Text>
          <Text>Thank you</Text>
        </View>

      </Page>
    </Document>
  );
};