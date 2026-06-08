import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────

export type PDFLineItem = {
  id: string
  chapter_id: string | null
  description: string
  unit: string
  quantity: number
  unit_price: number
  total: number
  descripcion_extendida: string | null
  titulo_partida: string | null
}

export type PDFChapter = {
  id: string
  name: string
  position: number
}

export type PDFTotals = {
  subtotal: number
  overhead: number
  overheadRate: number
  overheadEnabled: boolean
  profit: number
  profitRate: number
  profitEnabled: boolean
  extras: number
  extrasDesc: string
  baseImponible: number
  taxType: string
  taxRate: number
  taxAmount: number
  total: number
}

export type PresupuestoPDFProps = {
  company: {
    name: string
    nif: string
    address: string
    phone: string
    email: string
    iban: string
  }
  client: {
    name: string
    nif: string
    address: string
    phone: string
    email: string
  }
  budget: {
    ref: string
    date: string
    validDays: number
    title: string | null
  }
  chapters: PDFChapter[]
  lineItems: PDFLineItem[]
  totals: PDFTotals
  show_iban: boolean
  show_signature: boolean
  signedLogoUrl: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  const parts = Math.abs(n).toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (n < 0 ? '-' : '') + parts.join(',')
}

// ── Palette ────────────────────────────────────────────────────────────────

const ORANGE = '#FF6A00'
const NAVY   = '#0D1B2A'
const LIGHT  = '#F4F6F9'
const MGRAY  = '#6B7B8C'
const BORDER = '#D5DCE4'
const MUTED  = '#9CA3AF'
const WHITE  = '#FFFFFF'

// ── Column flex weights ────────────────────────────────────────────────────
// Nº(0.6) | Desc(4) | Ud(0.7) | Cant(1.1) | P.Unit(1.5) | Total(1.5)

const COL = { num: 0.6, desc: 4, unit: 0.7, qty: 1.1, price: 1.5, total: 1.5 }

// ── Styles ─────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: NAVY,
    paddingTop: 42,
    paddingBottom: 38,
    paddingHorizontal: 42,
  },

  // Fixed footer (absolute, repeats every page)
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  footerText: { fontSize: 7.5, color: MUTED },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: { flex: 1, paddingRight: 20 },
  headerRight: { width: 170, alignItems: 'flex-end' },

  logo: { height: 50, marginBottom: 5 },

  companyName:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  companyDetail: { fontSize: 8, color: MGRAY, marginBottom: 1 },

  budgetLabel: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 1, marginBottom: 3 },
  budgetRef:   { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: ORANGE, marginBottom: 5 },
  budgetTitle: { fontSize: 9, color: MGRAY, marginBottom: 5, fontStyle: 'italic' },
  budgetDetail:{ fontSize: 8, color: MGRAY, marginBottom: 1 },

  // Orange divider
  divider: { height: 2, backgroundColor: ORANGE, marginBottom: 10 },

  // ── Client block ────────────────────────────────────────────────────────
  clientBlock: {
    backgroundColor: LIGHT,
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
  },
  clientTitle:  { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MGRAY, marginBottom: 4 },
  clientName:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 1 },
  clientDetail: { fontSize: 8, color: MGRAY, marginBottom: 1 },

  // ── Chapter header ───────────────────────────────────────────────────────
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginTop: 8,
  },
  chapterName:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE, flex: 1 },
  chapterSubtotal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE },

  // ── Table header ─────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MGRAY },

  // ── Item row ─────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingHorizontal: 4,
    paddingVertical: 3.5,
    alignItems: 'flex-start',
  },
  itemRowAlt: { backgroundColor: '#FAFAFA' },

  tdNum:   { fontSize: 8, color: MUTED },
  tdDesc:  { fontSize: 8.5, color: NAVY },
  tdRight: { fontSize: 8.5, color: NAVY, textAlign: 'right' },

  // ── Summary ──────────────────────────────────────────────────────────────
  summaryContainer: { marginTop: 14, alignItems: 'flex-end' },
  summaryTable:     { width: 230, borderWidth: 0.5, borderColor: BORDER },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  summaryLabel:      { fontSize: 8.5, color: MGRAY },
  summaryValue:      { fontSize: 8.5, color: NAVY },
  summaryRowTotal:   { backgroundColor: NAVY },
  summaryLabelTotal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE },
  summaryValueTotal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE },

  // ── IBAN ─────────────────────────────────────────────────────────────────
  ibanBlock: { marginTop: 10, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: BORDER },
  ibanText:  { fontSize: 8.5, color: MGRAY },

  // ── Signature ────────────────────────────────────────────────────────────
  signatureBlock: { flexDirection: 'row', marginTop: 24 },
  signatureItem:  { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  signatureLine:  { width: '100%', height: 0.5, backgroundColor: NAVY, marginTop: 28 },
  signatureLabel: { fontSize: 8, color: MGRAY, marginTop: 4 },
})

// ── Sub-components ─────────────────────────────────────────────────────────

function ItemRow({
  chIdx, itemIdx, item, isAlt,
}: {
  chIdx: number
  itemIdx: number
  item: PDFLineItem
  isAlt: boolean
}) {
  const displayDesc = item.descripcion_extendida ?? item.description
  return (
    <View style={[S.itemRow, isAlt ? S.itemRowAlt : {}]}>
      <Text style={[S.tdNum,  { flex: COL.num   }]}>{chIdx + 1}.{itemIdx + 1}</Text>
      <View style={{ flex: COL.desc }}>
        {item.titulo_partida ? (
          <Text style={[S.tdDesc, { fontFamily: 'Helvetica-Bold', marginBottom: 1 }]}>
            {item.titulo_partida}
          </Text>
        ) : null}
        <Text style={S.tdDesc}>{displayDesc}</Text>
      </View>
      <Text style={[S.tdRight,{ flex: COL.unit  }]}>{item.unit || '—'}</Text>
      <Text style={[S.tdRight,{ flex: COL.qty   }]}>{fmt(item.quantity)}</Text>
      <Text style={[S.tdRight,{ flex: COL.price }]}>{fmt(item.unit_price)} €</Text>
      <Text style={[S.tdRight,{ flex: COL.total }]}>{fmt(item.total)} €</Text>
    </View>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PresupuestoPDF({
  company, client, budget, chapters, lineItems,
  totals, show_iban, show_signature, signedLogoUrl,
}: PresupuestoPDFProps) {

  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position)

  const hasClient = !!(client.name || client.nif || client.address || client.phone || client.email)

  const { subtotal, overhead, overheadRate, overheadEnabled,
          profit, profitRate, profitEnabled,
          extras, extrasDesc, baseImponible,
          taxType, taxRate, taxAmount, total } = totals

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Fixed footer (every page) ──────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>{company.name}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

        {/* ── Header (page 1 only, in flow) ─────────────────────────── */}
        <View style={S.header}>
          {/* Left: logo + company info */}
          <View style={S.headerLeft}>
            {signedLogoUrl ? <Image style={S.logo} src={signedLogoUrl} /> : null}
            <Text style={S.companyName}>{company.name || 'Sin nombre'}</Text>
            {company.nif     ? <Text style={S.companyDetail}>NIF/CIF: {company.nif}</Text>     : null}
            {company.address ? <Text style={S.companyDetail}>{company.address}</Text>           : null}
            {company.phone   ? <Text style={S.companyDetail}>Tel: {company.phone}</Text>        : null}
            {company.email   ? <Text style={S.companyDetail}>{company.email}</Text>             : null}
          </View>

          {/* Right: budget reference */}
          <View style={S.headerRight}>
            <Text style={S.budgetLabel}>PRESUPUESTO</Text>
            <Text style={S.budgetRef}>{budget.ref}</Text>
            {budget.title ? <Text style={S.budgetTitle}>{budget.title}</Text> : null}
            <Text style={S.budgetDetail}>Fecha: {budget.date}</Text>
            <Text style={S.budgetDetail}>Validez: {budget.validDays} días</Text>
          </View>
        </View>

        {/* ── Orange divider ─────────────────────────────────────────── */}
        <View style={S.divider} />

        {/* ── Client block ───────────────────────────────────────────── */}
        {hasClient ? (
          <View style={S.clientBlock}>
            <Text style={S.clientTitle}>DATOS DEL CLIENTE</Text>
            {client.name    ? <Text style={S.clientName}>{client.name}</Text>                       : null}
            {client.nif     ? <Text style={S.clientDetail}>NIF/CIF: {client.nif}</Text>             : null}
            {client.address ? <Text style={S.clientDetail}>{client.address}</Text>                  : null}
            {client.phone   ? <Text style={S.clientDetail}>Tel: {client.phone}</Text>               : null}
            {client.email   ? <Text style={S.clientDetail}>{client.email}</Text>                    : null}
          </View>
        ) : null}

        {/* ── Chapters and items ─────────────────────────────────────── */}
        {sortedChapters.map((chapter, chIdx) => {
          const items = lineItems
            .filter(i => i.chapter_id === chapter.id)
            .sort((a, b) => a.id.localeCompare(b.id)) // stable order; position not in PDFLineItem
          if (items.length === 0) return null
          const chSubtotal = items.reduce((s, i) => s + i.total, 0)

          return (
            <View key={chapter.id}>
              {/* Chapter header + table header + first 2 rows: never orphaned */}
              <View wrap={false}>
                <View style={S.chapterRow}>
                  <Text style={S.chapterName}>{chapter.name.toUpperCase()}</Text>
                  <Text style={S.chapterSubtotal}>{fmt(chSubtotal)} €</Text>
                </View>
                {/* Table header */}
                <View style={S.tableHeader}>
                  <Text style={[S.th, { flex: COL.num   }]}>Nº</Text>
                  <Text style={[S.th, { flex: COL.desc  }]}>DESCRIPCIÓN</Text>
                  <Text style={[S.th, { flex: COL.unit  }, { textAlign: 'right' }]}>UD.</Text>
                  <Text style={[S.th, { flex: COL.qty   }, { textAlign: 'right' }]}>CANT.</Text>
                  <Text style={[S.th, { flex: COL.price }, { textAlign: 'right' }]}>P. UNIT.</Text>
                  <Text style={[S.th, { flex: COL.total }, { textAlign: 'right' }]}>TOTAL</Text>
                </View>
                {/* First 2 items kept with chapter header */}
                {items.slice(0, 2).map((item, idx) => (
                  <ItemRow key={item.id} chIdx={chIdx} itemIdx={idx} item={item} isAlt={idx % 2 === 1} />
                ))}
              </View>

              {/* Remaining items: each row won't split across pages */}
              {items.slice(2).map((item, idx) => (
                <View key={item.id} wrap={false}>
                  <ItemRow chIdx={chIdx} itemIdx={idx + 2} item={item} isAlt={(idx + 2) % 2 === 1} />
                </View>
              ))}
            </View>
          )
        })}

        {/* ── Orphan items (no chapter) ──────────────────────────────── */}
        {(() => {
          const orphans = lineItems.filter(
            i => !i.chapter_id || !chapters.find(c => c.id === i.chapter_id)
          )
          if (orphans.length === 0) return null
          return (
            <View>
              <View wrap={false}>
                <View style={S.chapterRow}>
                  <Text style={S.chapterName}>SIN CAPÍTULO</Text>
                </View>
                <View style={S.tableHeader}>
                  <Text style={[S.th, { flex: COL.num  }]}>Nº</Text>
                  <Text style={[S.th, { flex: COL.desc }]}>DESCRIPCIÓN</Text>
                  <Text style={[S.th, { flex: COL.unit  }, { textAlign: 'right' }]}>UD.</Text>
                  <Text style={[S.th, { flex: COL.qty   }, { textAlign: 'right' }]}>CANT.</Text>
                  <Text style={[S.th, { flex: COL.price }, { textAlign: 'right' }]}>P. UNIT.</Text>
                  <Text style={[S.th, { flex: COL.total }, { textAlign: 'right' }]}>TOTAL</Text>
                </View>
                {orphans.slice(0, 2).map((item, idx) => (
                  <ItemRow key={item.id} chIdx={sortedChapters.length} itemIdx={idx} item={item} isAlt={idx % 2 === 1} />
                ))}
              </View>
              {orphans.slice(2).map((item, idx) => (
                <View key={item.id} wrap={false}>
                  <ItemRow chIdx={sortedChapters.length} itemIdx={idx + 2} item={item} isAlt={(idx + 2) % 2 === 1} />
                </View>
              ))}
            </View>
          )
        })()}

        {/* ── Summary ────────────────────────────────────────────────── */}
        <View style={S.summaryContainer} wrap={false}>
          <View style={S.summaryTable}>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Presupuesto de ejecución material</Text>
              <Text style={S.summaryValue}>{fmt(subtotal)} €</Text>
            </View>
            {overheadEnabled ? (
              <View style={S.summaryRow}>
                <Text style={S.summaryLabel}>Gastos generales ({overheadRate}%)</Text>
                <Text style={S.summaryValue}>{fmt(overhead)} €</Text>
              </View>
            ) : null}
            {profitEnabled ? (
              <View style={S.summaryRow}>
                <Text style={S.summaryLabel}>Beneficio industrial ({profitRate}%)</Text>
                <Text style={S.summaryValue}>{fmt(profit)} €</Text>
              </View>
            ) : null}
            {extras > 0 ? (
              <View style={S.summaryRow}>
                <Text style={S.summaryLabel}>{extrasDesc || 'Extras'}</Text>
                <Text style={S.summaryValue}>{fmt(extras)} €</Text>
              </View>
            ) : null}
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { fontFamily: 'Helvetica-Bold', color: NAVY }]}>Base imponible</Text>
              <Text style={[S.summaryValue, { fontFamily: 'Helvetica-Bold' }]}>{fmt(baseImponible)} €</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>{taxType} ({taxRate}%)</Text>
              <Text style={S.summaryValue}>{fmt(taxAmount)} €</Text>
            </View>
            <View style={[S.summaryRow, S.summaryRowTotal]}>
              <Text style={S.summaryLabelTotal}>TOTAL</Text>
              <Text style={S.summaryValueTotal}>{fmt(total)} €</Text>
            </View>
          </View>
        </View>

        {/* ── IBAN ───────────────────────────────────────────────────── */}
        {show_iban && company.iban ? (
          <View style={S.ibanBlock}>
            <Text style={S.ibanText}>Número de cuenta (IBAN): {company.iban}</Text>
          </View>
        ) : null}

        {/* ── Signature ──────────────────────────────────────────────── */}
        {show_signature ? (
          <View style={S.signatureBlock} wrap={false}>
            {['Lugar y fecha:', 'Firma del cliente:', 'Firma y sello:'].map(label => (
              <View key={label} style={S.signatureItem}>
                <View style={S.signatureLine} />
                <Text style={S.signatureLabel}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}

      </Page>
    </Document>
  )
}
