import type { Context } from "hono";
import { escrowService } from "@/services";
import { BadRequestError } from "@/middlewares";
import { isValidAddress } from "@/utils";

export const escrowController = {
  /**
   * GET /escrows/by-address
   * Get all escrows for a user address
   */
  async getByAddress(c: Context) {
    const address = c.req.query("address");

    if (!address) {
      throw new BadRequestError("Address is required");
    }

    if (!isValidAddress(address)) {
      throw new BadRequestError("Invalid Ethereum address");
    }

    const escrows = await escrowService.getEscrowsByUserAddress(address);
    return c.json({ ok: true, data: escrows });
  },

  /**
   * GET /escrows/:chainId/:escrowAddress
   * Get escrow by chain and address
   */
  async getByChainAndAddress(c: Context) {
    const chainId = Number(c.req.param("chainId"));
    const escrowAddress = c.req.param("escrowAddress");

    if (isNaN(chainId)) {
      throw new BadRequestError("Invalid chain ID");
    }

    if (!isValidAddress(escrowAddress)) {
      throw new BadRequestError("Invalid escrow address");
    }

    const escrow = await escrowService.getEscrowByAddress(chainId, escrowAddress);

    if (!escrow) {
      return c.json({ ok: false, error: "Escrow not found" }, 404);
    }

    return c.json({ ok: true, data: escrow });
  },
};
