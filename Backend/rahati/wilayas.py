"""Official Algerian wilayas and code helpers."""

WILAYAS = (
    ("01", "Adrar"),
    ("02", "Chlef"),
    ("03", "Laghouat"),
    ("04", "Oum El Bouaghi"),
    ("05", "Batna"),
    ("06", "Bejaia"),
    ("07", "Biskra"),
    ("08", "Bechar"),
    ("09", "Blida"),
    ("10", "Bouira"),
    ("11", "Tamanrasset"),
    ("12", "Tebessa"),
    ("13", "Tlemcen"),
    ("14", "Tiaret"),
    ("15", "Tizi Ouzou"),
    ("16", "Alger"),
    ("17", "Djelfa"),
    ("18", "Jijel"),
    ("19", "Setif"),
    ("20", "Saida"),
    ("21", "Skikda"),
    ("22", "Sidi Bel Abbes"),
    ("23", "Annaba"),
    ("24", "Guelma"),
    ("25", "Constantine"),
    ("26", "Medea"),
    ("27", "Mostaganem"),
    ("28", "M'Sila"),
    ("29", "Mascara"),
    ("30", "Ouargla"),
    ("31", "Oran"),
    ("32", "El Bayadh"),
    ("33", "Illizi"),
    ("34", "Bordj Bou Arreridj"),
    ("35", "Boumerdes"),
    ("36", "El Tarf"),
    ("37", "Tindouf"),
    ("38", "Tissemsilt"),
    ("39", "El Oued"),
    ("40", "Khenchela"),
    ("41", "Souk Ahras"),
    ("42", "Tipaza"),
    ("43", "Mila"),
    ("44", "Ain Defla"),
    ("45", "Naama"),
    ("46", "Ain Temouchent"),
    ("47", "Ghardaia"),
    ("48", "Relizane"),
    ("49", "Timimoun"),
    ("50", "Bordj Badji Mokhtar"),
    ("51", "Ouled Djellal"),
    ("52", "Beni Abbes"),
    ("53", "In Salah"),
    ("54", "In Guezzam"),
    ("55", "Touggourt"),
    ("56", "Djanet"),
    ("57", "El M'Ghair"),
    ("58", "El Meniaa"),
)

WILAYA_CHOICES = WILAYAS
WILAYA_CODES = frozenset(code for code, _ in WILAYAS)
_WILAYA_NAMES = dict(WILAYAS)


def normalize_wilaya_code(code):
    """Return a valid two-digit wilaya code, or ``None`` for invalid input."""
    if isinstance(code, int):
        code = f"{code:02d}"
    if not isinstance(code, str):
        return None
    code = code.strip()
    if code.isdigit() and len(code) == 1:
        code = code.zfill(2)
    return code if code in WILAYA_CODES else None


def is_valid_wilaya(code):
    """Return whether ``code`` identifies one of the 58 wilayas."""
    return normalize_wilaya_code(code) is not None


def get_wilaya_name(code):
    """Return the official display name for a code, or ``None`` if invalid."""
    normalized = normalize_wilaya_code(code)
    return _WILAYA_NAMES.get(normalized) if normalized else None
