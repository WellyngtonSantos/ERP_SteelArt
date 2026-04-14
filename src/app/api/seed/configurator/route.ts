import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// Seed idempotente do configurador "Monte o seu" — popula categorias e opcoes tipicas
// pra chales. Pode rodar quantas vezes quiser: nao cria duplicatas e nao sobrescreve
// valores que o admin ja tenha editado (so cria o que nao existe).
//
// Todas as categorias sao MULTIPLE (cada opcao pode ser ligada/desligada individualmente).

const SEED_DATA: Array<{
  category: { name: string; description: string; selectionType: 'SINGLE' | 'MULTIPLE'; order: number }
  options: Array<{ name: string; unitPrice: number; tempoDias: number; order: number }>
}> = [
  {
    category: { name: 'Cobertura', description: 'Tipo de telhado do chale', selectionType: 'MULTIPLE', order: 1 },
    options: [
      { name: 'Telha Galvalume', unitPrice: 3500, tempoDias: 1, order: 1 },
      { name: 'Telha Sanduiche TermoAcustica', unitPrice: 6500, tempoDias: 2, order: 2 },
      { name: 'Telha Ceramica', unitPrice: 4200, tempoDias: 2, order: 3 },
      { name: 'Policarbonato Alveolar', unitPrice: 5800, tempoDias: 1, order: 4 },
      { name: 'Telha Shingle', unitPrice: 8900, tempoDias: 3, order: 5 },
    ],
  },
  {
    category: { name: 'Revestimento', description: 'Acabamento das paredes', selectionType: 'MULTIPLE', order: 2 },
    options: [
      { name: 'ACM (Aluminio Composto)', unitPrice: 7500, tempoDias: 2, order: 1 },
      { name: 'Vidro Temperado', unitPrice: 9800, tempoDias: 3, order: 2 },
      { name: 'Madeira Ripada', unitPrice: 6200, tempoDias: 2.5, order: 3 },
      { name: 'Alvenaria', unitPrice: 4500, tempoDias: 4, order: 4 },
      { name: 'Chapa Perfurada', unitPrice: 5200, tempoDias: 2, order: 5 },
      { name: 'Chapa Lisa Pintada', unitPrice: 3800, tempoDias: 1.5, order: 6 },
    ],
  },
  {
    category: { name: 'Piso', description: 'Acabamento do piso interno', selectionType: 'MULTIPLE', order: 3 },
    options: [
      { name: 'Madeira Macica', unitPrice: 8500, tempoDias: 3, order: 1 },
      { name: 'Porcelanato', unitPrice: 4800, tempoDias: 2, order: 2 },
      { name: 'Ceramica', unitPrice: 3200, tempoDias: 2, order: 3 },
      { name: 'Laminado', unitPrice: 3800, tempoDias: 1.5, order: 4 },
      { name: 'Cimento Queimado', unitPrice: 2800, tempoDias: 2, order: 5 },
      { name: 'Deck Externo (madeira)', unitPrice: 6500, tempoDias: 2, order: 6 },
    ],
  },
  {
    category: { name: 'Climatizacao', description: 'Equipamentos de aquecimento e refrigeracao', selectionType: 'MULTIPLE', order: 4 },
    options: [
      { name: 'Ar Condicionado Split 12.000 BTU', unitPrice: 3500, tempoDias: 1, order: 1 },
      { name: 'Ar Condicionado Split 18.000 BTU', unitPrice: 4500, tempoDias: 1, order: 2 },
      { name: 'Aquecedor Eletrico a Oleo', unitPrice: 1200, tempoDias: 0.5, order: 3 },
      { name: 'Aquecedor de Ambiente (Halogen)', unitPrice: 600, tempoDias: 0.5, order: 4 },
      { name: 'Ventilador de Teto', unitPrice: 800, tempoDias: 0.5, order: 5 },
      { name: 'Lareira Eletrica', unitPrice: 2500, tempoDias: 1, order: 6 },
    ],
  },
  {
    category: { name: 'Iluminacao', description: 'Kit de iluminacao', selectionType: 'MULTIPLE', order: 5 },
    options: [
      { name: 'Kit LED Embutido (8 pontos)', unitPrice: 1800, tempoDias: 1, order: 1 },
      { name: 'Lustre Decorativo', unitPrice: 1200, tempoDias: 0.5, order: 2 },
      { name: 'Iluminacao Externa (4 arandelas)', unitPrice: 1400, tempoDias: 0.5, order: 3 },
      { name: 'Sensor de Presenca', unitPrice: 400, tempoDias: 0.5, order: 4 },
    ],
  },
  {
    category: { name: 'Extras e Opcionais', description: 'Complementos do chale', selectionType: 'MULTIPLE', order: 6 },
    options: [
      { name: 'Janela de Aluminio Extra', unitPrice: 1800, tempoDias: 1, order: 1 },
      { name: 'Porta de Aluminio Extra', unitPrice: 2200, tempoDias: 1, order: 2 },
      { name: 'Bancada de Pia (granito)', unitPrice: 2800, tempoDias: 1, order: 3 },
      { name: 'Churrasqueira Metalica', unitPrice: 4500, tempoDias: 2, order: 4 },
      { name: 'Forro PVC', unitPrice: 2400, tempoDias: 1.5, order: 5 },
      { name: 'Forro de Gesso', unitPrice: 3800, tempoDias: 2.5, order: 6 },
      { name: 'Isolamento Termo-Acustico', unitPrice: 3200, tempoDias: 1.5, order: 7 },
      { name: 'Caixa d\'Agua 500L', unitPrice: 950, tempoDias: 0.5, order: 8 },
      { name: 'Deck/Varanda Externa', unitPrice: 5500, tempoDias: 3, order: 9 },
      { name: 'Escada Metalica (2 andares)', unitPrice: 4800, tempoDias: 2, order: 10 },
    ],
  },
]

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const result = {
      categoriesCreated: 0,
      categoriesExisting: 0,
      optionsCreated: 0,
      optionsExisting: 0,
    }

    for (const entry of SEED_DATA) {
      // Upsert da categoria (name e unique)
      let cat = await prisma.configuratorCategory.findUnique({
        where: { name: entry.category.name },
      })

      if (!cat) {
        cat = await prisma.configuratorCategory.create({
          data: entry.category,
        })
        result.categoriesCreated++
      } else {
        result.categoriesExisting++
      }

      // Para cada opcao: so cria se nao existir outra com o mesmo nome na mesma categoria
      for (const opt of entry.options) {
        const existing = await prisma.configuratorOption.findFirst({
          where: { categoryId: cat.id, name: opt.name },
        })
        if (existing) {
          result.optionsExisting++
          continue
        }
        await prisma.configuratorOption.create({
          data: { ...opt, categoryId: cat.id },
        })
        result.optionsCreated++
      }
    }

    return NextResponse.json({
      message: 'Seed do configurador concluido',
      ...result,
    })
  } catch (err) {
    console.error('Erro no seed do configurador:', err)
    return NextResponse.json({ error: 'Erro ao executar seed do configurador' }, { status: 500 })
  }
}
