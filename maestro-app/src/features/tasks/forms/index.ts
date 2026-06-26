// src/features/tasks/forms/index.ts — HT_FORM_MAP (Blueprint v3)
import React from 'react';
import type { HtFormProps } from '../../../types/task';

import { HT01_CompletePO }     from './HT01_CompletePO';
import { HT02_VerifyCOO }      from './HT02_VerifyCOO';
import { HT03_ISFElements }    from './HT03_ISFElements';
import { HT04_ISFDoNotLoad }   from './HT04_ISFDoNotLoad';
import { HT05_ISFAmendment }   from './HT05_ISFAmendment';
import { HT06_HTSReview }      from './HT06_HTSReview';
import { HT07_HTSManual }      from './HT07_HTSManual';
import { HT08_COODocs }        from './HT08_COODocs';
import { HT09_PGAHold }        from './HT09_PGAHold';
import { HT10_PGARefusal }     from './HT10_PGARefusal';
import { HT11_OFACFuzzy }      from './HT11_OFACFuzzy';
import { HT12_OFACHit }        from './HT12_OFACHit';
import { HT13_CBPExam }        from './HT13_CBPExam';
import { HT14_CF28 }           from './HT14_CF28';
import { HT15_CF29 }           from './HT15_CF29';
import { HT16_DocDiscrepancy } from './HT16_DocDiscrepancy';
import { HT17_DutyVariance }   from './HT17_DutyVariance';
import { HT18_DutySavings }    from './HT18_DutySavings';

export const HT_FORM_MAP: Record<string, React.ComponentType<HtFormProps>> = {
  'HT-01': HT01_CompletePO,
  'HT-02': HT02_VerifyCOO,
  'HT-03': HT03_ISFElements,
  'HT-04': HT04_ISFDoNotLoad,
  'HT-05': HT05_ISFAmendment,
  'HT-06': HT06_HTSReview,
  'HT-07': HT07_HTSManual,
  'HT-08': HT08_COODocs,
  'HT-09': HT09_PGAHold,
  'HT-10': HT10_PGARefusal,
  'HT-11': HT11_OFACFuzzy,
  'HT-12': HT12_OFACHit,
  'HT-13': HT13_CBPExam,
  'HT-14': HT14_CF28,
  'HT-15': HT15_CF29,
  'HT-16': HT16_DocDiscrepancy,
  'HT-17': HT17_DutyVariance,
  'HT-18': HT18_DutySavings,
};

export {
  HT01_CompletePO, HT02_VerifyCOO, HT03_ISFElements, HT04_ISFDoNotLoad,
  HT05_ISFAmendment, HT06_HTSReview, HT07_HTSManual, HT08_COODocs,
  HT09_PGAHold, HT10_PGARefusal, HT11_OFACFuzzy, HT12_OFACHit,
  HT13_CBPExam, HT14_CF28, HT15_CF29, HT16_DocDiscrepancy,
  HT17_DutyVariance, HT18_DutySavings
};
