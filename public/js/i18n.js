// Lightweight i18n. Spanish is the default; English is a toggle.
const DICT = {
  es: {
    // nav / common
    'nav.ways': 'Formas de enviar',
    'nav.how': 'Cómo funciona',
    'nav.fees': 'Tarifas',
    'nav.help': 'Ayuda',
    'nav.login': 'Iniciar sesión',
    'nav.logout': 'Cerrar sesión',
    'nav.transfers': 'Mis envíos',
    'nav.admin': 'Admin',
    'nav.send': 'Enviar dinero',
    'common.back': 'Atrás',
    'common.continue': 'Continuar',
    'common.save': 'Guardar',
    'common.saved': 'Guardado ✓',
    'common.remove': 'Eliminar',

    // hero
    'hero.title1': 'Envía dinero a Cuba,',
    'hero.title2': 'apoya a quienes amas',
    'hero.lead': 'Transferencias rápidas y seguras desde $10. Paga con PayPal o transferencia bancaria — tu familia elige cómo recibirlo.',
    'hero.p1': 'MLC, entrega de USD en efectivo, pesos cubanos y recarga Cubacel',
    'hero.p2': 'Tarifas transparentes — ve el monto exacto que reciben',
    'hero.p3': 'Tu primer envío, sin comisión',

    // calculator
    'calc.title': 'Calcula tu envío',
    'calc.send': 'Tú envías',
    'calc.receiveVia': 'Reciben mediante',
    'calc.enterAmount': 'Ingresa un monto para ver la cotización…',
    'calc.transferAmount': 'Monto del envío',
    'calc.fee': 'Comisión',
    'calc.youPay': 'Tú pagas',
    'calc.theyReceive': 'Reciben',
    'calc.delivery': 'Entrega',
    'calc.indicative': 'Tasa indicativa. La tasa final se confirma al pagar.',

    // stats
    'stats.ways': 'Formas de recibir',
    'stats.mins': 'Para recarga móvil',
    'stats.provinces': 'Provincias cubiertas',
    'stats.support': 'Soporte en español',
    'stats.minsValue': '~ min',

    // methods section
    'methods.eyebrow': 'Formas de enviar',
    'methods.title': 'Un envío, cinco formas de recibir',
    'methods.sub': 'Elige lo que mejor funcione para tu familia en Cuba — dinero en el banco, efectivo a domicilio o saldo en el teléfono.',
    'methods.receiveIn': 'Reciben en',
    'methods.min': 'Mín',
    'methods.max': 'Máx',

    // how
    'how.eyebrow': 'Cómo funciona',
    'how.title': 'Dinero a Cuba en cuatro pasos',
    'how.s1t': 'Crea tu cuenta',
    'how.s1p': 'Regístrate y verifica tu identidad una vez — requisito legal para enviar dinero.',
    'how.s2t': 'Agrega tu destinatario',
    'how.s2p': 'Indica quién recibe el dinero y cómo: MLC, efectivo, pesos o recarga móvil.',
    'how.s3t': 'Paga a tu manera',
    'how.s3p': 'Financia el envío de forma segura con PayPal o transferencia bancaria (IBAN/SEPA).',
    'how.s4t': 'Lo reciben',
    'how.s4p': 'Pagamos en Cuba y te mantenemos informado hasta la entrega.',
    'how.cta': 'Iniciar un envío',

    // trust band
    'trust.eyebrow': 'Por qué CubaRemesa',
    'trust.title': 'Hecho para la confianza',
    'trust.sub': 'Enviar dinero a casa es personal. Lo hacemos seguro, claro y confiable.',
    'trust.f1t': 'Seguro por diseño',
    'trust.f1p': 'Cifrado de nivel bancario, verificación de identidad y control de sanciones en cada envío.',
    'trust.f2t': 'Sin tarifas ocultas',
    'trust.f2p': 'Ves la comisión y el monto exacto que recibe tu familia antes de pagar — siempre.',
    'trust.f3t': 'Especialistas en Cuba',
    'trust.f3p': 'Enfocados en el corredor de Cuba con socios de pago en las 16 provincias.',

    // fees
    'fees.eyebrow': 'Tarifas y tasas',
    'fees.title': 'Precios claros para cada método',
    'fees.sub': 'Tasas en vivo de nuestro sistema. Ajustadas al mercado — confirmadas al pagar.',
    'fees.method': 'Método',
    'fees.receiveIn': 'Reciben en',
    'fees.rate': 'Tasa (por $1)',
    'fees.fee': 'Comisión',
    'fees.deliveryCol': 'Entrega',
    'fees.free': 'Gratis',

    // faq
    'faq.eyebrow': 'Ayuda',
    'faq.title': 'Preguntas frecuentes',
    'faq.q1': '¿Es legal enviar dinero a Cuba?',
    'faq.a1': 'Sí — las remesas familiares están permitidas según la normativa aplicable. Realizamos verificación de identidad (KYC) y control de sanciones en cada envío para cumplir con la ley.',
    'faq.q2': '¿Cómo recibe el dinero mi familia?',
    'faq.a2': 'Tú eliges al pagar: transferencia a MLC o tarjeta, USD en efectivo a domicilio, pesos cubanos (CUP) en efectivo, o recarga móvil Cubacel.',
    'faq.q3': '¿Cómo pago?',
    'faq.a3': 'De forma segura con PayPal o por transferencia bancaria (IBAN/SEPA). Recibirás los datos bancarios y una referencia única si eliges transferencia.',
    'faq.q4': '¿Cuánto tarda la entrega?',
    'faq.a4': 'Las recargas Cubacel llegan en minutos. Los pagos en efectivo y bancarios suelen tardar de 1 a 7 días hábiles según el método y la provincia.',
    'faq.q5': '¿Cuáles son las comisiones?',
    'faq.a5': 'Las comisiones varían según el método de pago y siempre se muestran antes de pagar. Consulta la tabla de tarifas en vivo arriba.',

    // cta / footer
    'cta.title': '¿Listo para enviar dinero a casa?',
    'cta.sub': 'Tu primer envío es sin comisión. Empezar toma dos minutos.',
    'cta.btn': 'Enviar dinero ahora',
    'footer.tagline': 'Transferencias de dinero rápidas y seguras a Cuba. Paga con PayPal o transferencia bancaria; tu familia recibe MLC, USD, efectivo en CUP o recarga móvil.',
    'footer.send': 'Enviar',
    'footer.company': 'Empresa',
    'footer.legal': 'Legal',
    'footer.terms': 'Términos del servicio',
    'footer.privacy': 'Política de privacidad',
    'footer.aml': 'Política AML / KYC',
    'footer.disclaimer': 'Plataforma de demostración. La transmisión de dinero es una actividad regulada — operar requiere las licencias correspondientes, controles KYC/AML y verificación de sanciones en cada jurisdicción.',

    // auth
    'auth.welcome': 'Bienvenido de nuevo',
    'auth.loginSub': 'Inicia sesión para enviar dinero y seguir tus envíos.',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.loginBtn': 'Iniciar sesión',
    'auth.noAccount': '¿Sin cuenta?',
    'auth.createOne': 'Crea una',
    'auth.createTitle': 'Crea tu cuenta',
    'auth.createSub': 'Dos minutos para empezar a enviar dinero a Cuba.',
    'auth.fullName': 'Nombre completo',
    'auth.phone': 'Teléfono',
    'auth.country': 'País',
    'auth.countryPh': 'p. ej. España',
    'auth.createBtn': 'Crear cuenta',
    'auth.haveAccount': '¿Ya registrado?',
    'auth.loginLink': 'Inicia sesión',

    // send wizard
    'wiz.amount': 'Monto',
    'wiz.recipient': 'Destinatario',
    'wiz.review': 'Revisar',
    'wiz.pay': 'Pagar',
    'wiz.s1title': '¿Cuánto vas a enviar?',
    'wiz.sendUsd': 'Tú envías (USD)',
    'wiz.s2title': '¿Quién recibe el dinero?',
    'wiz.addNew': 'Agregar nuevo destinatario',
    'wiz.noSaved': 'Aún no hay destinatarios guardados para este método.',
    'wiz.fullName': 'Nombre completo',
    'wiz.phoneCuba': 'Teléfono en Cuba',
    'wiz.province': 'Provincia',
    'wiz.s3title': 'Revisa tu envío',
    'wiz.confirmPay': 'Confirmar y continuar al pago',
    'wiz.totalPay': 'Total a pagar',
    'wiz.method': 'Método',
    'wiz.estDelivery': 'Entrega estimada',
    'wiz.s4title': 'Paga tu envío',
    'wiz.order': 'Pedido',
    'wiz.youPay2': 'Tú pagas',
    'wiz.bankTransfer': 'Transferencia bancaria (IBAN)',
    'wiz.demoNote': 'Modo demo: no hay credenciales de PayPal configuradas. Haz clic abajo para simular un pago exitoso con PayPal.',
    'wiz.simulate': 'Simular pago con PayPal',
    'wiz.ibanNote': 'Transfiere el monto exacto e incluye la referencia para poder identificar tu pago.',
    'wiz.beneficiary': 'Beneficiario',
    'wiz.bank': 'Banco',
    'wiz.amountWord': 'Monto',
    'wiz.reference': 'Referencia',
    'wiz.madeTransfer': 'Ya hice la transferencia',
    'wiz.doneTitle': 'Envío creado',
    'wiz.viewTransfers': 'Ver mis envíos',
    'wiz.errName': 'Ingresa el nombre del destinatario o elige uno guardado.',
    'wiz.errDetails': 'Completa todos los datos de pago del destinatario.',
    'wiz.doneBank': 'Estamos esperando tu transferencia bancaria para el pedido {ref}. Una vez recibida, procesaremos el pago y te mantendremos informado.',
    'wiz.donePaypal': 'Pago recibido para el pedido {ref}. Ahora estamos procesando el pago a tu destinatario en Cuba.',

    // recipient field labels
    'rf.bank': 'Banco',
    'rf.account': 'Número de cuenta / tarjeta MLC',
    'rf.card': 'Número de tarjeta MLC',
    'rf.address': 'Dirección de entrega',
    'rf.municipality': 'Municipio',
    'rf.phone': 'Número de teléfono Cubacel',

    // dashboard
    'dash.title': 'Mis envíos',
    'dash.hi': 'Hola',
    'dash.new': 'Nuevo envío',
    'dash.ref': 'Referencia',
    'dash.date': 'Fecha',
    'dash.recipient': 'Destinatario',
    'dash.method': 'Método',
    'dash.theyGet': 'Reciben',
    'dash.youPaid': 'Pagaste',
    'dash.status': 'Estado',
    'dash.empty': 'Aún no hay envíos.',
    'dash.sendFirst': 'Haz tu primer envío →',
    'dash.savedRecipients': 'Destinatarios guardados',
    'dash.noRecipients': 'Aún no hay destinatarios guardados.',
    'dash.kyc.unverified': 'Identidad sin verificar',
    'dash.kyc.pending': 'Verificación de identidad pendiente',
    'dash.kyc.verified': 'Identidad verificada ✓',

    // status labels
    'st.pending_payment': 'Pago pendiente',
    'st.awaiting_transfer': 'Esperando transferencia',
    'st.paid': 'Pagado',
    'st.processing': 'Procesando',
    'st.completed': 'Completado',
    'st.cancelled': 'Cancelado',
    'st.failed': 'Fallido',

    // method labels (override server English)
    'm.mlc_bank': 'Transferencia bancaria MLC (BANDEC / BPA / Metropolitano)',
    'm.mlc_card': 'Recarga de tarjeta MLC',
    'm.usd_cash': 'Entrega de USD en efectivo a domicilio',
    'm.cup_cash': 'Entrega de pesos cubanos (CUP) en efectivo',
    'm.cubacel': 'Recarga móvil Cubacel',
    // eta labels
    'eta.mlc_bank': '5–7 días hábiles',
    'eta.mlc_card': '3–5 días hábiles',
    'eta.usd_cash': '2–5 días hábiles',
    'eta.cup_cash': '1–3 días hábiles',
    'eta.cubacel': 'En minutos',
  },

  en: {
    'nav.ways': 'Ways to send', 'nav.how': 'How it works', 'nav.fees': 'Fees', 'nav.help': 'Help',
    'nav.login': 'Log in', 'nav.logout': 'Log out', 'nav.transfers': 'My transfers', 'nav.admin': 'Admin', 'nav.send': 'Send money',
    'common.back': 'Back', 'common.continue': 'Continue', 'common.save': 'Save', 'common.saved': 'Saved ✓', 'common.remove': 'Remove',

    'hero.title1': 'Send money to Cuba,', 'hero.title2': 'support the people you love',
    'hero.lead': 'Fast, secure transfers from $10. Pay with PayPal or bank transfer — your family chooses how they receive it.',
    'hero.p1': 'MLC, USD cash delivery, Cuban pesos & Cubacel top-up',
    'hero.p2': 'Transparent fees — see the exact amount they receive',
    'hero.p3': 'Your first transfer fee is on us',

    'calc.title': 'Calculate your transfer', 'calc.send': 'You send', 'calc.receiveVia': 'They receive via',
    'calc.enterAmount': 'Enter an amount to see the quote…', 'calc.transferAmount': 'Transfer amount', 'calc.fee': 'Fee',
    'calc.youPay': 'You pay', 'calc.theyReceive': 'They receive', 'calc.delivery': 'Delivery',
    'calc.indicative': 'Indicative rate. Final rate is confirmed at checkout.',

    'stats.ways': 'Ways to receive', 'stats.mins': 'For mobile top-up', 'stats.provinces': 'Provinces covered',
    'stats.support': 'Support in Spanish', 'stats.minsValue': '~ mins',

    'methods.eyebrow': 'Ways to send', 'methods.title': 'One transfer, five ways to receive',
    'methods.sub': 'Choose what works best for your family in Cuba — money in the bank, cash at the door, or airtime on the phone.',
    'methods.receiveIn': 'They receive in', 'methods.min': 'Min', 'methods.max': 'Max',

    'how.eyebrow': 'How it works', 'how.title': 'Money to Cuba in four steps',
    'how.s1t': 'Create your account', 'how.s1p': 'Sign up and verify your identity once — a legal requirement for money transfers.',
    'how.s2t': 'Add your recipient', 'how.s2p': 'Enter who receives the money and how: MLC, cash, pesos or mobile top-up.',
    'how.s3t': 'Pay your way', 'how.s3p': 'Fund the transfer securely with PayPal or a bank (IBAN/SEPA) transfer.',
    'how.s4t': 'They receive it', 'how.s4p': "We pay out in Cuba and keep you updated until it's delivered.",
    'how.cta': 'Start a transfer',

    'trust.eyebrow': 'Why CubaRemesa', 'trust.title': 'Built for trust',
    'trust.sub': 'Sending money home is personal. We make it safe, clear and dependable.',
    'trust.f1t': 'Secure by design', 'trust.f1p': 'Bank-grade encryption, identity verification and sanctions screening on every transfer.',
    'trust.f2t': 'No hidden fees', 'trust.f2p': 'You see the fee and the exact amount your family receives before you pay — always.',
    'trust.f3t': 'Cuba specialists', 'trust.f3p': 'Focused on the Cuba corridor with payout partners across all 16 provinces.',

    'fees.eyebrow': 'Fees & rates', 'fees.title': 'Clear pricing for every method',
    'fees.sub': 'Live rates from our system. Adjusted to market conditions — confirmed at checkout.',
    'fees.method': 'Method', 'fees.receiveIn': 'They receive in', 'fees.rate': 'Rate (per $1)', 'fees.fee': 'Fee', 'fees.deliveryCol': 'Delivery', 'fees.free': 'Free',

    'faq.eyebrow': 'Help', 'faq.title': 'Frequently asked questions',
    'faq.q1': 'Is it legal to send money to Cuba?',
    'faq.a1': 'Yes — family remittances are permitted under applicable regulations. We run identity (KYC) and sanctions checks on every transfer to stay compliant.',
    'faq.q2': 'How does my family receive the money?',
    'faq.a2': 'You choose at checkout: MLC bank transfer or card, USD cash delivered to the door, Cuban pesos (CUP) cash, or Cubacel mobile top-up.',
    'faq.q3': 'How do I pay?',
    'faq.a3': "Securely with PayPal or by bank transfer (IBAN/SEPA). You'll get the bank details and a unique reference if you choose bank transfer.",
    'faq.q4': 'How long does delivery take?',
    'faq.a4': 'Cubacel top-ups arrive within minutes. Cash and bank payouts typically take 1–7 business days depending on the method and province.',
    'faq.q5': 'What are the fees?',
    'faq.a5': 'Fees vary by payout method and are always shown before you pay. See the live fee table above.',

    'cta.title': 'Ready to send money home?', 'cta.sub': 'Your first transfer fee is on us. It takes two minutes to get started.',
    'cta.btn': 'Send money now',
    'footer.tagline': 'Fast, secure money transfers to Cuba. Pay with PayPal or bank transfer; your family receives MLC, USD, CUP cash or mobile top-up.',
    'footer.send': 'Send', 'footer.company': 'Company', 'footer.legal': 'Legal',
    'footer.terms': 'Terms of service', 'footer.privacy': 'Privacy policy', 'footer.aml': 'AML / KYC policy',
    'footer.disclaimer': 'Demonstration platform. Money transmission is a regulated activity — operating requires the appropriate licences, KYC/AML controls and sanctions screening in each jurisdiction served.',

    'auth.welcome': 'Welcome back', 'auth.loginSub': 'Log in to send money and track your transfers.',
    'auth.email': 'Email', 'auth.password': 'Password', 'auth.loginBtn': 'Log in', 'auth.noAccount': 'No account?', 'auth.createOne': 'Create one',
    'auth.createTitle': 'Create your account', 'auth.createSub': 'Two minutes to start sending money to Cuba.',
    'auth.fullName': 'Full name', 'auth.phone': 'Phone', 'auth.country': 'Country', 'auth.countryPh': 'e.g. Spain',
    'auth.createBtn': 'Create account', 'auth.haveAccount': 'Already registered?', 'auth.loginLink': 'Log in',

    'wiz.amount': 'Amount', 'wiz.recipient': 'Recipient', 'wiz.review': 'Review', 'wiz.pay': 'Pay',
    'wiz.s1title': 'How much are you sending?', 'wiz.sendUsd': 'You send (USD)',
    'wiz.s2title': 'Who is receiving the money?', 'wiz.addNew': 'Add a new recipient',
    'wiz.noSaved': 'No saved recipients for this method yet.',
    'wiz.fullName': 'Full name', 'wiz.phoneCuba': 'Phone in Cuba', 'wiz.province': 'Province',
    'wiz.s3title': 'Review your transfer', 'wiz.confirmPay': 'Confirm & continue to payment',
    'wiz.totalPay': 'Total to pay', 'wiz.method': 'Method', 'wiz.estDelivery': 'Estimated delivery',
    'wiz.s4title': 'Pay for your transfer', 'wiz.order': 'Order', 'wiz.youPay2': 'You pay',
    'wiz.bankTransfer': 'Bank transfer (IBAN)',
    'wiz.demoNote': 'Demo mode: no PayPal credentials configured. Click below to simulate a successful PayPal payment.',
    'wiz.simulate': 'Simulate PayPal payment',
    'wiz.ibanNote': 'Transfer the exact amount and include the reference so we can match your payment.',
    'wiz.beneficiary': 'Beneficiary', 'wiz.bank': 'Bank', 'wiz.amountWord': 'Amount', 'wiz.reference': 'Reference',
    'wiz.madeTransfer': "I've made the transfer", 'wiz.doneTitle': 'Transfer created', 'wiz.viewTransfers': 'View my transfers',
    'wiz.errName': 'Please enter the recipient name or pick a saved recipient.',
    'wiz.errDetails': 'Please complete all recipient payout details.',
    'wiz.doneBank': "We're waiting for your bank transfer for order {ref}. Once received, we'll process the payout and keep you posted.",
    'wiz.donePaypal': "Payment received for order {ref}. We're now processing the payout to your recipient in Cuba.",

    'rf.bank': 'Bank', 'rf.account': 'MLC account / card number', 'rf.card': 'MLC card number',
    'rf.address': 'Delivery address', 'rf.municipality': 'Municipality', 'rf.phone': 'Cubacel phone number',

    'dash.title': 'My transfers', 'dash.hi': 'Hi', 'dash.new': 'New transfer',
    'dash.ref': 'Reference', 'dash.date': 'Date', 'dash.recipient': 'Recipient', 'dash.method': 'Method',
    'dash.theyGet': 'They get', 'dash.youPaid': 'You paid', 'dash.status': 'Status',
    'dash.empty': 'No transfers yet.', 'dash.sendFirst': 'Send your first transfer →',
    'dash.savedRecipients': 'Saved recipients', 'dash.noRecipients': 'No saved recipients yet.',
    'dash.kyc.unverified': 'Identity not yet verified', 'dash.kyc.pending': 'Identity verification pending', 'dash.kyc.verified': 'Identity verified ✓',

    'st.pending_payment': 'Pending payment', 'st.awaiting_transfer': 'Awaiting transfer', 'st.paid': 'Paid',
    'st.processing': 'Processing', 'st.completed': 'Completed', 'st.cancelled': 'Cancelled', 'st.failed': 'Failed',

    'm.mlc_bank': 'MLC bank transfer (BANDEC / BPA / Metropolitano)', 'm.mlc_card': 'MLC card top-up',
    'm.usd_cash': 'USD cash delivery to the door', 'm.cup_cash': 'Cuban peso (CUP) cash delivery', 'm.cubacel': 'Cubacel mobile top-up',
    'eta.mlc_bank': '5–7 business days', 'eta.mlc_card': '3–5 business days', 'eta.usd_cash': '2–5 business days',
    'eta.cup_cash': '1–3 business days', 'eta.cubacel': 'Within minutes',
  },
};

export function getLang() {
  return localStorage.getItem('lang') || 'es';
}
export function setLang(l) {
  localStorage.setItem('lang', l);
  document.documentElement.lang = l;
}
export function t(key, vars) {
  const lang = getLang();
  let s = (DICT[lang] && DICT[lang][key]) ?? (DICT.es[key] ?? key);
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}
// Translate a payout method label / eta by its method code.
export function methodLabel(code) { return t('m.' + code); }
export function methodEta(code) { return t('eta.' + code); }

// Apply translations to any element carrying data-i18n / data-i18n-ph / data-i18n-html.
export function applyI18n(root = document) {
  document.documentElement.lang = getLang();
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
}
