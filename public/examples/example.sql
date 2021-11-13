select
  Candidate,
  Election_year,
  sum(Total_ $),
  count(*)
from
  combined_party_data
where
  Election_year = 2016
group by
  Candidate,
  Election_year
having
  count(*) > 80
order by
  count(*) DESC
