// HT-01 — Complete PO Data (role: ImporterOps, SLA: 2 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, FormSelect, DecisionBtn, useTaskSubmit } from './shared';

export const HT01_CompletePO = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({
    poNumber: inp.poNumber || '',
    supplierAddress: '',
    goodsDescription: inp.goodsDescription || '',
    quantity: '',
    unitPriceUsd: '',
    totalValueUsd: '',
    incoterms: '',
    expectedShipDate: '',
    portOfLoading: '',
    portOfEntry: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: 'Complete' | 'Escalate') => {
    setSubmitting(true);
    try {
      await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="Complete Purchase Order Data" task={task} onClose={onClose}>
      {inp.missingFields?.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #d97706', borderRadius: '8px', padding: '12px', fontSize: '0.875rem' }}>
          <strong>Missing fields:</strong> {(inp.missingFields as string[]).join(', ')}
        </div>
      )}
      {inp.supplierName && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Supplier: <strong>{inp.supplierName}</strong></p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <FormRow label="PO Number"><FormInput value={form.poNumber} onChange={set('poNumber')} placeholder="PO-2024-XXXX" /></FormRow>
        <FormRow label="Supplier Address"><FormInput value={form.supplierAddress} onChange={set('supplierAddress')} placeholder="Dubai, UAE" /></FormRow>
        <FormRow label="Goods Description"><FormInput value={form.goodsDescription} onChange={set('goodsDescription')} placeholder="Electronics, Textiles…" /></FormRow>
        <FormRow label="Quantity"><FormInput value={form.quantity} onChange={set('quantity')} placeholder="1000 units" /></FormRow>
        <FormRow label="Unit Price (USD)"><FormInput value={form.unitPriceUsd} onChange={set('unitPriceUsd')} placeholder="125.00" /></FormRow>
        <FormRow label="Total Value (USD)"><FormInput value={form.totalValueUsd} onChange={set('totalValueUsd')} placeholder="125000.00" /></FormRow>
        <FormRow label="Incoterms">
          <FormSelect value={form.incoterms} onChange={set('incoterms')} options={[
            { value: 'FOB', label: 'FOB' }, { value: 'CIF', label: 'CIF' },
            { value: 'DAP', label: 'DAP' }, { value: 'DDP', label: 'DDP' },
            { value: 'EXW', label: 'EXW' },
          ]} />
        </FormRow>
        <FormRow label="Expected Ship Date"><FormInput value={form.expectedShipDate} onChange={set('expectedShipDate')} placeholder="YYYY-MM-DD" /></FormRow>
        <FormRow label="Port of Loading"><FormInput value={form.portOfLoading} onChange={set('portOfLoading')} placeholder="AEJEA (Dubai)" /></FormRow>
        <FormRow label="Port of Entry"><FormInput value={form.portOfEntry} onChange={set('portOfEntry')} placeholder="USLAX (Los Angeles)" /></FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <DecisionBtn label="Escalate" variant="warning" disabled={submitting} onClick={() => submit('Escalate')} />
        <DecisionBtn label="✓ Complete PO" variant="primary" disabled={submitting} onClick={() => submit('Complete')} />
      </div>
    </TaskFrame>
  );
};
