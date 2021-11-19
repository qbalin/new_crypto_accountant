/*
Étant donné une liste de transactions
{
  from: address A,
  to: address B,
  currency,
  amount,
  timestamp: T
}
{
  from: address C,
  to: address B,
  currency,
  amount,
  timestamp: T + 1
}
on voudrait grouper certaines adresses ensemble. Par exemple, si je contrôle l'adresse
A et l'adresse C, je voudrais les grouper comme étant "À moi", et transformer la liste
comme suit:
{
  from: address "À moi",
  to: address B,
  currency,
  amount,
  timestamp: T
}
{
  from: address "À moi",
  to: address B,
  currency,
  amount,
  timestamp: T + 1
}
*/
