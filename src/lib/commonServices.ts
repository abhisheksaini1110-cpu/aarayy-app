import type { ItemCategory } from './types';

export interface CommonConstructionService {
  description: string;
  category: ItemCategory;
  unit: string;
  rate: number;
  taxable: boolean;
}

const service = (
  description: string,
  category: ItemCategory,
  unit = 'lump sum',
  taxable = true,
): CommonConstructionService => ({ description, category, unit, rate: 0, taxable });

/**
 * Starter catalogue for a full-service residential and commercial renovator.
 * Rates intentionally start at zero so the business can enter its own pricing.
 */
export const COMMON_CONSTRUCTION_SERVICES: CommonConstructionService[] = [
  service('Site setup, protection and mobilization', 'General Renovation'),
  service('General renovation labour', 'Labour', 'hour'),
  service('Project supervision and coordination', 'General Renovation', 'day'),
  service('Interior demolition labour', 'Demolition', 'hour'),
  service('Complete interior demolition', 'Demolition'),
  service('Remove existing flooring', 'Demolition', 'square foot'),
  service('Remove kitchen cabinets and countertops', 'Demolition'),
  service('Remove bathroom fixtures and finishes', 'Demolition'),
  service('Construction debris removal', 'Cleanup & Disposal'),
  service('Dumpster rental and disposal', 'Cleanup & Disposal', 'each'),
  service('Daily job-site cleanup', 'Cleanup & Disposal', 'day'),
  service('Final construction cleanup', 'Cleanup & Disposal'),
  service('Interior wall framing', 'Framing & Carpentry', 'linear foot'),
  service('Bulkhead and ceiling framing', 'Framing & Carpentry', 'linear foot'),
  service('Rough carpentry labour', 'Framing & Carpentry', 'hour'),
  service('Finish carpentry labour', 'Framing & Carpentry', 'hour'),
  service('Batt insulation installation', 'General Renovation', 'square foot'),
  service('Vapour barrier installation', 'General Renovation', 'square foot'),
  service('Drywall board installation', 'Drywall', 'square foot'),
  service('Drywall taping and mudding', 'Drywall', 'square foot'),
  service('Drywall skim coating', 'Drywall', 'square foot'),
  service('Drywall patch and repair', 'Drywall'),
  service('Ceiling texture removal and skim coat', 'Drywall', 'square foot'),
  service('Interior wall and ceiling painting', 'Painting', 'square foot'),
  service('Prime new drywall', 'Painting', 'square foot'),
  service('Paint doors and trim', 'Painting', 'linear foot'),
  service('Baseboard supply and installation', 'Framing & Carpentry', 'linear foot'),
  service('Crown moulding installation', 'Framing & Carpentry', 'linear foot'),
  service('Interior door installation', 'Framing & Carpentry', 'each'),
  service('Subfloor repair and preparation', 'Flooring', 'square foot'),
  service('Floor levelling compound installation', 'Flooring', 'square foot'),
  service('Hardwood flooring installation', 'Flooring', 'square foot'),
  service('Engineered hardwood installation', 'Flooring', 'square foot'),
  service('Laminate flooring installation', 'Flooring', 'square foot'),
  service('Luxury vinyl plank installation', 'Flooring', 'square foot'),
  service('Carpet installation', 'Flooring', 'square foot'),
  service('Floor tile installation', 'Tiling', 'square foot'),
  service('Wall and backsplash tile installation', 'Tiling', 'square foot'),
  service('Tile grout and sealing', 'Tiling', 'square foot'),
  service('Shower waterproofing system', 'Bathroom Renovation'),
  service('Bathroom vanity installation', 'Bathroom Renovation', 'each'),
  service('Kitchen cabinet installation', 'Kitchen Renovation', 'linear foot'),
  service('Countertop installation', 'Kitchen Renovation', 'square foot'),
  service('Plumbing fixture installation', 'Plumbing', 'each'),
  service('Plumbing rough-in', 'Plumbing'),
  service('Electrical outlet or switch installation', 'Electrical', 'each'),
  service('Lighting fixture installation', 'Electrical', 'each'),
  service('Electrical rough-in', 'Electrical'),
  service('HVAC ductwork modification', 'HVAC'),
  service('Concrete demolition and removal', 'Concrete & Masonry', 'square foot'),
  service('Concrete slab installation', 'Concrete & Masonry', 'square foot'),
  service('Masonry repair', 'Concrete & Masonry'),
  service('Roofing shingle replacement', 'Roofing & Exterior', 'square foot'),
  service('Exterior siding installation', 'Roofing & Exterior', 'square foot'),
  service('Exterior door or window installation', 'Roofing & Exterior', 'each'),
  service('Equipment rental', 'Equipment', 'day'),
  service('Building permit allowance', 'Permits', 'lump sum', false),
  service('Subcontractor allowance', 'Subcontractor'),
  service('Material delivery charge', 'Materials', 'each'),
];
