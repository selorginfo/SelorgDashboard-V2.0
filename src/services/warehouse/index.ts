import { realGrnService } from "@/services/warehouse/grnService.real";
import type { GrnService } from "@/services/warehouse/grnService";
import { realPutawayService } from "@/services/warehouse/putawayService.real";
import type { PutawayService } from "@/services/warehouse/putawayService";
import { realTransferService } from "@/services/warehouse/transferService.real";
import type { TransferService } from "@/services/warehouse/transferService";

export const grnService: GrnService = realGrnService;
export const putawayService: PutawayService = realPutawayService;
export const transferService: TransferService = realTransferService;
