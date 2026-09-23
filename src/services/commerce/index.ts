import { realCustomerService } from "@/services/commerce/customerService.real";
import type { CustomerService } from "@/services/commerce/customerService";
import { realCxTicketService } from "@/services/commerce/cxTicketService.real";
import type { CxTicketService } from "@/services/commerce/cxTicketService";

export const customerService: CustomerService = realCustomerService;
export const cxTicketService: CxTicketService = realCxTicketService;
