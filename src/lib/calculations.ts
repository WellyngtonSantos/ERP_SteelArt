// Motor de calculo do ERP MetalGestao

// Horario de trabalho padrao da empresa: 08:00 as 18:00 = 10h/dia
export const WORK_START_TIME = '08:00'
export const WORK_END_TIME = '18:00'
export const WORK_HOURS_PER_DAY = 10

// Dias uteis padrao (fallback). Folha real usa dias corridos do mes.
export const BUSINESS_DAYS_PER_MONTH = 22

export function calcCustoEmpresaDia(custoFixoMensal: number, folhaSalarial: number): number {
  return (custoFixoMensal + folhaSalarial) / BUSINESS_DAYS_PER_MONTH
}

// Valor/hora a partir do salario diario: um dia = 10h de trabalho (8h-18h).
export function calcValorHoraFromDaily(dailyCost: number): number {
  return dailyCost / WORK_HOURS_PER_DAY
}

// Legado: custo mensal / 220h. Equivalente a dailyCost/10 se dailyCost = monthlyCost/22.
export function calcValorHora(custoMensal: number): number {
  return custoMensal / (BUSINESS_DAYS_PER_MONTH * WORK_HOURS_PER_DAY)
}

// Modelo da planilha Precificacao.xlsx (usado pela SteelArt ha anos):
// preco_final = custo_total * (1 + (lucro% + imposto% + causalidade%) / 100)
// preco_com_desconto = preco_final - (preco_final * desconto% / 100)
// imposto_R$ = preco_final * imposto% / 100
// lucro_liquido = preco_final - custo_total
export function calcOrcamento(params: {
  custoMateriais: number
  custoMaoDeObra: number
  custoPintura: number
  corteDobra?: number
  instalacao?: number
  margemLucro: number
  margemCausalidade: number
  aliquotaImposto: number
  descontoPercent?: number
}): {
  custoBase: number
  custoComCausalidade: number
  imposto: number
  lucro: number
  precoFinal: number
  precoComDesconto: number
  lucroLiquido: number
} {
  const {
    custoMateriais,
    custoMaoDeObra,
    custoPintura,
    corteDobra = 0,
    instalacao = 0,
    margemLucro,
    margemCausalidade,
    aliquotaImposto,
    descontoPercent = 0,
  } = params

  const custoBase = custoMateriais + custoMaoDeObra + custoPintura + corteDobra + instalacao
  const somaPct = margemLucro + margemCausalidade + aliquotaImposto
  const precoFinal = custoBase * (1 + somaPct / 100)
  const imposto = precoFinal * (aliquotaImposto / 100)
  const lucro = precoFinal * (margemLucro / 100)
  const custoComCausalidade = custoBase * (1 + margemCausalidade / 100)
  const precoComDesconto = precoFinal - (precoFinal * descontoPercent) / 100
  const lucroLiquido = precoFinal - custoBase

  return {
    custoBase,
    custoComCausalidade,
    imposto,
    lucro,
    precoFinal,
    precoComDesconto,
    lucroLiquido,
  }
}

// Modo operacional: mao-de-obra = custoOperacionalDia * diasExecucao (substitui corte/dobra/instalacao/pintura).
export function calcOrcamentoOperacional(params: {
  custoOperacionalDia: number
  diasExecucao: number
  custoMateriais: number
  margemLucro: number
  margemCausalidade: number
  aliquotaImposto: number
  descontoPercent?: number
}): {
  custoOperacional: number
  custoBase: number
  custoComCausalidade: number
  imposto: number
  lucro: number
  precoFinal: number
  precoComDesconto: number
  lucroLiquido: number
} {
  const {
    custoOperacionalDia,
    diasExecucao,
    custoMateriais,
    margemLucro,
    margemCausalidade,
    aliquotaImposto,
    descontoPercent = 0,
  } = params

  const custoOperacional = custoOperacionalDia * diasExecucao
  const custoBase = custoOperacional + custoMateriais
  const somaPct = margemLucro + margemCausalidade + aliquotaImposto
  const precoFinal = custoBase * (1 + somaPct / 100)
  const imposto = precoFinal * (aliquotaImposto / 100)
  const lucro = precoFinal * (margemLucro / 100)
  const custoComCausalidade = custoBase * (1 + margemCausalidade / 100)
  const precoComDesconto = precoFinal - (precoFinal * descontoPercent) / 100
  const lucroLiquido = precoFinal - custoBase

  return {
    custoOperacional,
    custoBase,
    custoComCausalidade,
    imposto,
    lucro,
    precoFinal,
    precoComDesconto,
    lucroLiquido,
  }
}

export function calcDRE(params: {
  receitaBruta: number
  impostos: number
  insumos: number
  maoDeObra: number
  custosFixos: number
}): {
  receitaBruta: number
  impostos: number
  receitaLiquida: number
  custoTotal: number
  lucroLiquido: number
  margemLiquida: number
} {
  const { receitaBruta, impostos, insumos, maoDeObra, custosFixos } = params
  const receitaLiquida = receitaBruta - impostos
  const custoTotal = insumos + maoDeObra + custosFixos
  const lucroLiquido = receitaLiquida - custoTotal
  const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

  return {
    receitaBruta,
    impostos,
    receitaLiquida,
    custoTotal,
    lucroLiquido,
    margemLiquida,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
