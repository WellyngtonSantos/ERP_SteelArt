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

export function calcOrcamento(params: {
  custoMateriais: number
  custoMaoDeObra: number
  custoPintura: number
  margemLucro: number      // percentual
  margemCausalidade: number // percentual
  aliquotaImposto: number  // percentual
}): {
  custoBase: number
  custoComCausalidade: number
  imposto: number
  lucro: number
  precoFinal: number
} {
  const { custoMateriais, custoMaoDeObra, custoPintura, margemLucro, margemCausalidade, aliquotaImposto } = params

  const custoBase = custoMateriais + custoMaoDeObra + custoPintura
  const custoComCausalidade = custoBase * (1 + margemCausalidade / 100)
  const lucro = custoComCausalidade * (margemLucro / 100)
  const subtotal = custoComCausalidade + lucro
  const imposto = subtotal * (aliquotaImposto / 100)
  const precoFinal = subtotal + imposto

  return {
    custoBase,
    custoComCausalidade,
    imposto,
    lucro,
    precoFinal,
  }
}

// Modo operacional: custo base = custoOperacionalDia * diasExecucao + custoMateriais.
// Substitui ferro + pintura + mao-de-obra manual por um unico calculo derivado da empresa.
export function calcOrcamentoOperacional(params: {
  custoOperacionalDia: number
  diasExecucao: number
  custoMateriais: number
  margemLucro: number
  margemCausalidade: number
  aliquotaImposto: number
}): {
  custoOperacional: number
  custoBase: number
  custoComCausalidade: number
  imposto: number
  lucro: number
  precoFinal: number
} {
  const {
    custoOperacionalDia,
    diasExecucao,
    custoMateriais,
    margemLucro,
    margemCausalidade,
    aliquotaImposto,
  } = params

  const custoOperacional = custoOperacionalDia * diasExecucao
  const custoBase = custoOperacional + custoMateriais
  const custoComCausalidade = custoBase * (1 + margemCausalidade / 100)
  const lucro = custoComCausalidade * (margemLucro / 100)
  const subtotal = custoComCausalidade + lucro
  const imposto = subtotal * (aliquotaImposto / 100)
  const precoFinal = subtotal + imposto

  return {
    custoOperacional,
    custoBase,
    custoComCausalidade,
    imposto,
    lucro,
    precoFinal,
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
