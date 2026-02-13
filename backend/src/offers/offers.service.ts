// ===== OFFERS SERVICE =====
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto, UpdateOfferDto } from './dto/offers.dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
  ) {}

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const offer = this.offerRepository.create({
      ...createOfferDto,
      trialPeriodDays: createOfferDto.trialPeriodDays ?? 30,
      endOfSale: createOfferDto.endOfSale ? new Date(createOfferDto.endOfSale) : null,
    });
    return this.offerRepository.save(offer);
  }

  async findAll(): Promise<Offer[]> {
    return this.offerRepository.find({ order: { createdAt: 'DESC' } });
  }


  /**
 * Récupérer uniquement les offres disponibles à la vente
 * (exclut les offres dont la date de fin de commercialisation est dépassée)
 */
async findAvailable(): Promise<Offer[]> {
  const today = new Date();
  
  const allOffers = await this.offerRepository.find({ 
    order: { createdAt: 'DESC' } 
  });
  
  // Filtrer les offres dont endOfSale n'est pas dépassé
  return allOffers.filter(offer => {
    if (!offer.endOfSale) {
      return true; // Pas de date de fin = toujours disponible
    }
    return new Date(offer.endOfSale) >= today;
  });
}
  async findOne(id: string): Promise<Offer> {
    const offer = await this.offerRepository.findOne({ where: { id } });
    if (!offer) {
      throw new NotFoundException('Offre non trouvée');
    }
    return offer;
  }

  
  async update(id: string, updateOfferDto: UpdateOfferDto): Promise<Offer> {
    const offer = await this.findOne(id);
    Object.assign(offer, {
      ...updateOfferDto,
      endOfSale: updateOfferDto.endOfSale ? new Date(updateOfferDto.endOfSale) : offer.endOfSale,
    });
    return this.offerRepository.save(offer);
  }

  async remove(id: string): Promise<void> {
    const offer = await this.findOne(id);
    await this.offerRepository.remove(offer);
  }
}
