// src/features/cases/CaseDetail.tsx — Full 7-stage view for one case (Blueprint v3)
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { CaseHeader } from './CaseHeader';
import { StageRail } from './StageRail';
import { CaseTimeline } from './CaseTimeline';
import { S1_OrderIntake, S2_ISF, S3_HTS, S4_PGA, S5_OFAC, S6_CustomsEntry, S7_PostEntry } from '../stages';
import { DocumentUpload } from '../documents/DocumentUpload';
import { DocumentChecklist } from '../documents/DocumentChecklist';
import { dfHelper } from '../../lib/sdk';
import { writeAuditEntry } from '../../lib/audit';
import type { ImportCaseRecord, IsfFilingRecord, OfacScreeningRecord, DutyCalculation, AuditEntry, ShipmentDocument } from '../../types/entities';

const ENV = import.meta.env;

interface CaseDetailProps {
  caseInstanceId: string;
  folderKey?: string;
  onBack?: () => void;
  // Optional pre-loaded case record (from legacy CaseDetails)
  caseRecord?: Partial<ImportCaseRecord>;
}

export const CaseDetail = ({ caseInstanceId, folderKey, onBack, caseRecord: initialRecord }: CaseDetailProps) => {
  const [caseRecord, setCaseRecord] = useState<Partial<ImportCaseRecord>>(initialRecord || {});
  // Note: setCaseRecord used when case data is refreshed from Data Fabric
  const _setCaseRecord = setCaseRecord;
  const [isf, setIsf] = useState<IsfFilingRecord | undefined>();
  const [ofacRecords, setOfacRecords] = useState<OfacScreeningRecord[]>([]);
  const [duty, setDuty] = useState<DutyCalculation | undefined>();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [documents, setDocuments] = useState<ShipmentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState(initialRecord?.CurrentStage || 'S1');
  const [showUpload, setShowUpload] = useState(false);

  const caseId = caseRecord.CaseRef || caseInstanceId;

  const loadRelated = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      await writeAuditEntry({ caseId, actionType: 'CASE_VIEWED', stageId: activeStage });

      const fetchEntity = async <T,>(entityEnv: string, filter: string): Promise<T[]> => {
        if (!entityEnv) return [];
        try {
          const res = await dfHelper.query(entityEnv, filter);
          const items = Array.isArray(res) ? res : (res as any).items || [];
          return items as T[];
        } catch { return []; }
      };

      const [isfList, ofacList, dutyList, auditList, docList] = await Promise.all([
        fetchEntity<IsfFilingRecord>(ENV.VITE_ENTITY_ISF, `CaseRef eq '${caseId}'`),
        fetchEntity<OfacScreeningRecord>(ENV.VITE_ENTITY_OFAC, `CaseRef eq '${caseId}'`),
        fetchEntity<DutyCalculation>(ENV.VITE_ENTITY_DUTY, `CaseRef eq '${caseId}'`),
        fetchEntity<AuditEntry>(ENV.VITE_ENTITY_AUDIT, `CaseRef eq '${caseId}'`),
        fetchEntity<ShipmentDocument>(ENV.VITE_ENTITY_DOC, `CaseRef eq '${caseId}'`),
      ]);

      setIsf(isfList[0]);
      setOfacRecords(ofacList);
      setDuty(dutyList[0]);
      setAuditEntries(auditList);
      setDocuments(docList);
    } catch (err) {
      console.error('[CaseDetail] Failed to load related records:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId, activeStage]);

  useEffect(() => { loadRelated(); }, [loadRelated]);

  const stageOrder = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const currentIdx = stageOrder.indexOf(caseRecord.CurrentStage || 'S1');

  const stageStatuses: Record<string, 'completed' | 'in_progress' | 'pending' | 'error'> = {};
  stageOrder.forEach((s, i) => {
    if (i < currentIdx) stageStatuses[s] = 'completed';
    else if (s === caseRecord.CurrentStage) stageStatuses[s] = 'in_progress';
    else stageStatuses[s] = 'pending';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
      {/* Back + Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <button onClick={() => loadRelated()} disabled={loading} className="btn btn-secondary" style={{ padding: '8px 14px', display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Case header */}
      <CaseHeader caseRecord={caseRecord} instanceId={caseInstanceId} />

      {/* Stage rail */}
      <StageRail
        currentStage={caseRecord.CurrentStage || 'S1'}
        stageStatuses={stageStatuses}
        onStageClick={setActiveStage}
      />

      {/* Active stage panel */}
      {activeStage === 'S1' && <S1_OrderIntake caseRecord={caseRecord} />}
      {activeStage === 'S2' && <S2_ISF isf={isf} />}
      {activeStage === 'S3' && <S3_HTS duty={duty} htsCode={caseRecord.HtsCode} />}
      {activeStage === 'S4' && <S4_PGA caseRecord={caseRecord} />}
      {activeStage === 'S5' && <S5_OFAC ofacRecords={ofacRecords} />}
      {activeStage === 'S6' && <S6_CustomsEntry caseRecord={caseRecord} />}
      {activeStage === 'S7' && (
        <>
          <S7_PostEntry caseRecord={caseRecord} onUploadClick={() => setShowUpload(s => !s)} />
          {showUpload && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem' }}>Upload Documents</h4>
              <DocumentUpload caseId={caseId} onUploaded={loadRelated} />
            </div>
          )}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem' }}>Document Checklist</h4>
            <DocumentChecklist documents={documents} caseId={caseId} />
          </div>
        </>
      )}

      {/* Timeline */}
      <CaseTimeline auditEntries={auditEntries} />
    </div>
  );
};

export default CaseDetail;
