import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    fontSize: 9,
    color: '#0f172a',
  },
  header: {
  marginBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#cbd5e1',
  paddingBottom: 8,
},
  title: {
    fontSize: 16,
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 2,
  },
  section: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  sectionBody: {
    padding: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCard: {
    width: '32%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '42%',
    fontWeight: 700,
  },
  value: {
    width: '58%',
  },
  sampleSection: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sampleHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sampleHeaderTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  sampleHeaderMeta: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  leftCol: {
    width: '65%',
  },
  rightCol: {
    width: '35%',
  },
  block: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  blockHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  blockHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  blockBody: {
    padding: 8,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  measurementCell: {
    width: '25%',
    padding: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightColor: '#e2e8f0',
    borderBottomColor: '#e2e8f0',
  },
  measurementLabel: {
    fontSize: 8,
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  measurementValue: {
    fontSize: 9,
    fontWeight: 700,
  },
  listItem: {
    marginBottom: 3,
    lineHeight: 1.35,
  },
  photosSection: {
    padding: 10,
    paddingTop: 0,
  },
  photoPageSection: {
  marginTop: 16,
},
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
 photoCard: {
  width: '48%',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 4,
  overflow: 'hidden',
  marginBottom: 8,
},
photo: {
  width: '100%',
  height: 180,
  objectFit: 'cover',
},
  summarySection: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  summaryBody: {
    padding: 10,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.45,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 12,
    right: 24,
    color: '#64748b',
  },
});

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const parseScoreNumber = (score) => {
  if (typeof score === 'number') return score;
  const match = String(score || '').match(/^\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const getSampleHeaderBg = (score) => {
  const n = parseScoreNumber(score);
  if (n == null) return '#f8fafc';
  if (n >= 6 && n <= 7) return '#dcfce7';
  if (n >= 4 && n <= 5) return '#fef3c7';
  return '#fecaca';
};

const renderListLines = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr.map((item, index) => (
    <Text key={index} style={styles.listItem}>
      • {item.color || item.name} ({String(item.percent || item.percentage || '').replace('%', '')}%)
    </Text>
  ));
};

const renderMultiLine = (val) => {
  if (!val) return null;
  return String(val)
    .split(/\r?\n|\\n/)
    .filter(Boolean)
    .map((line, index) => (
      <Text key={index} style={styles.listItem}>
        • {line}
      </Text>
    ));
};

const renderConsistency = (obj) => {
  if (!obj) return null;
  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([k, v], index) => (
      <Text key={index} style={styles.listItem}>
        • {k.charAt(0).toUpperCase() + k.slice(1)}: {String(v).replace('%', '')}%
      </Text>
    ));
};

const renderDefectsSelected = (arr, defectNameById) => {
  if (!Array.isArray(arr) || !arr.length) return null;

  return arr.map((d, index) => {
    const name = defectNameById?.get?.(d.id) || d.id || 'Defect';
    const unit = d.unit || 'qty';
    const value = d.value ?? '';
    const pct = d.pct ?? null;

    let text = `• ${name}`;
    if (unit === 'qty' && value !== '') text += ` — ${value}`;
    if (unit === 'qty' && pct !== null && pct !== undefined) text += ` (${pct}%)`;
    if (unit === 'pct' && value !== '') text += ` — ${value}%`;

    return (
      <Text key={index} style={styles.listItem}>
        {text}
      </Text>
    );
  });
};

const measurementItems = (sample) => [
  ['Packing Type', sample.packing_type],
  ['Size', sample.size],
  ['Box Weight', (sample.box_weight_min || sample.box_weight_max) ? `${sample.box_weight_min || ''} – ${sample.box_weight_max || ''} kg` : null],
  ['Fruit Weight', (sample.fruit_weight_min || sample.fruit_weight_max) ? `${sample.fruit_weight_min || ''} – ${sample.fruit_weight_max || ''} g` : null],
  ['Punnet Weight', (sample.punnet_weight_min || sample.punnet_weight_max) ? `${sample.punnet_weight_min || ''} – ${sample.punnet_weight_max || ''} g` : null],
  ['Bag Weight', (sample.bag_weight_min || sample.bag_weight_max) ? `${sample.bag_weight_min || ''} – ${sample.bag_weight_max || ''} g` : null],
  ['Calibration', (sample.calibration_min || sample.calibration_max) ? `${sample.calibration_min || ''} – ${sample.calibration_max || ''}` : null],
  ['Rhizome Weight', (sample.rhizome_weight_min || sample.rhizome_weight_max) ? `${sample.rhizome_weight_min || ''} – ${sample.rhizome_weight_max || ''} g` : null],
  ['Pressures', (sample.pressures_min || sample.pressures_max) ? `${sample.pressures_min || ''} – ${sample.pressures_max || ''} kg` : null],
  ['Brix', (sample.brix_min || sample.brix_max) ? `${sample.brix_min || ''} – ${sample.brix_max || ''} °` : null],
  ['Diameter', (sample.fruit_diameter_min || sample.fruit_diameter_max) ? `${sample.fruit_diameter_min || ''} – ${sample.fruit_diameter_max || ''} mm` : null],
].filter(([, value]) => value);

const chunkPhotos = (arr, size = 4) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export default function ReportPdfDocument({
  report,
  samples,
  photos,
  defectNameById,
}) {
  const getPhotosForSample = (id) => photos.filter((p) => p.sample_id === id);

  return (
    <Document title={`${report?.client_ref || 'report'}_report`}>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.title}>Quality Inspection Report</Text>
          <Text style={styles.subtitle}>
            {report?.client || '—'}
            {report?.client_ref ? ` • Ref ${report.client_ref}` : ''}
            {report?.container_number ? ` • Container ${report.container_number}` : ''}
          </Text>
          <Text style={styles.subtitle}>
            {formatDate(report?.date)}
            {report?.location ? ` • ${report.location}` : ''}
            {report?.variety ? ` • ${report.variety}` : ''}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>General Information</Text>
          </View>

          <View style={[styles.sectionBody, styles.infoGrid]}>
            {[
              ['Date', formatDate(report?.date)],
              ['Client', report?.client],
              ['Ref', report?.client_ref],
              ['Container #', report?.container_number],
              ['RoChecks Ref', report?.rochecks_ref],
              ['Supplier', report?.supplier],
              ['Variety', report?.variety],
              ['Origin', report?.origin],
              ['Location', report?.location],
              ['Total Pallets', report?.total_pallets],
              ['Type', report?.type],
              ['Surveyor', report?.surveyor],
              ['Brand', report?.brand],
              ['Temperature', report?.temperature],
              ['Category', report?.category],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <View key={label} style={styles.infoCard}>
                  <View style={styles.row}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.value}>{String(value)}</Text>
                  </View>
                </View>
              ))}
          </View>
        </View>

        {samples.map((sample, idx) => {
  const photosForSample = getPhotosForSample(sample.id);
  const photoGroups = chunkPhotos(photosForSample, 4);

  return (
    <React.Fragment key={sample.id || idx}>
      <View
        style={styles.sampleSection}
        break={idx > 0}
      >
        <View style={[styles.sampleHeader, { backgroundColor: getSampleHeaderBg(sample.quality_score) }]}>
          <Text style={styles.sampleHeaderTitle}>
            PALLET: {sample.pallet_number ?? idx + 1}
          </Text>

          <Text style={styles.sampleHeaderMeta}>
            {sample.ggn_number ? `GGN: ${sample.ggn_number}   ` : ''}
            {sample.ggn_exp_date ? `GGN EXP DATE: ${sample.ggn_exp_date}   ` : ''}
            {sample.grower_code ? `GROWER CODE: ${sample.grower_code}   ` : ''}
            {sample.packing_code ? `PACKING CODE: ${sample.packing_code}   ` : ''}
            {sample.variety ? `VARIETY: ${sample.variety}   ` : ''}
            {sample.brand ? `BRAND: ${sample.brand}` : ''}
          </Text>

          <Text style={styles.sampleHeaderMeta}>
            Quality Score: {sample.quality_score ?? '—'}   |   Storage Score: {sample.storage_score ?? '—'}
          </Text>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.leftCol}>
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockHeaderText}>Measurements</Text>
              </View>
              <View style={styles.measurementGrid}>
                {measurementItems(sample).map(([label, value]) => (
                  <View key={label} style={styles.measurementCell}>
                    <Text style={styles.measurementLabel}>{label}</Text>
                    <Text style={styles.measurementValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.rightCol}>
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockHeaderText}>Minor Defects</Text>
              </View>
              <View style={styles.blockBody}>
                {renderDefectsSelected(sample.minor_defects_selected, defectNameById) || renderMultiLine(sample.minor_defects) || <Text>—</Text>}
              </View>
            </View>

            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockHeaderText}>Major Defects</Text>
              </View>
              <View style={styles.blockBody}>
                {renderDefectsSelected(sample.major_defects_selected, defectNameById) || renderMultiLine(sample.major_defects) || <Text>—</Text>}
              </View>
            </View>

            {(sample.external_coloration || sample.internal_coloration || sample.consistency) && (
              <View style={styles.block}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockHeaderText}>Coloration / Consistency</Text>
                </View>
                <View style={styles.blockBody}>
                  {renderListLines(sample.external_coloration)}
                  {renderListLines(sample.internal_coloration)}
                  {renderConsistency(sample.consistency)}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {photoGroups.length > 0 && photoGroups.map((group, groupIndex) => (
        <View
          key={`${sample.id}-photos-${groupIndex}`}
          style={styles.photoPageSection}
          break
        >
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockHeaderText}>
                Pallet {sample.pallet_number ?? idx + 1} — Photos
                {photoGroups.length > 1 ? ` (${groupIndex + 1}/${photoGroups.length})` : ''}
              </Text>
            </View>
            <View style={styles.blockBody}>
              <View style={styles.photoGrid}>
                {group.map((photo) => (
                  <View key={photo.id || photo.url} style={styles.photoCard}>
                    <Image src={photo.url} style={styles.photo} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ))}
    </React.Fragment>
  );
})}
        {(report?.qualityScore || report?.storageScore || report?.conclusion) && (
          <View style={styles.summarySection} break>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Final Summary</Text>
            </View>
            <View style={styles.summaryBody}>
              {report?.qualityScore && (
                <Text style={styles.summaryText}>Quality Score: {report.qualityScore}</Text>
              )}
              {report?.storageScore && (
                <Text style={styles.summaryText}>Storage Score: {report.storageScore}</Text>
              )}
              {report?.conclusion && (
                <Text style={[styles.summaryText, { marginTop: 8 }]}>
                  {report.conclusion}
                </Text>
              )}
            </View>
          </View>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}