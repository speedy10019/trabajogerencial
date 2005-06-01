##############################################################################
#
# Copyright (c) 2002, 2005 Nexedi SARL and Contributors. All Rights Reserved.
#                    Jean-Paul Smets-Solanes <jp@nexedi.com>
#                    Romain Courteaud <romain@nexedi.com>
#
# WARNING: This program as such is intended to be used by professional
# programmers who take the whole responsability of assessing all potential
# consequences resulting from its eventual inadequacies and bugs
# End users who are looking for a ready-to-use solution with commercial
# garantees and support are strongly adviced to contract a Free Software
# Service Company
#
# This program is Free Software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
#
##############################################################################

from TargetSolver import TargetSolver
from zLOG import LOG

class CopyToTarget(TargetSolver):
  """
    Copy values simulation movement as target. This is
    only acceptable for root movements. The meaning of
    this solver of other movements is far from certain.
  """
  def solve(self, movement):
    """
      Adopt values as new target
    """
    # Reduce quantity
    movement.edit(
      quantity=movement.getDeliveryQuantity() * movement.getDeliveryRatio(),
      start_date=movement.getDeliveryStartDateList()[0],
      stop_date=movement.getDeliveryStopDateList()[0]
    )
